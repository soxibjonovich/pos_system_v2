from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from pathlib import Path
import shutil
import uuid

from database import get_db
from crud import products as crud
from schemas import products as schema

router = APIRouter(tags=["Products"])

UPLOAD_DIR = Path("/uploads/products")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def validate_image(file: UploadFile) -> bool:
    """Validate uploaded image file"""
    if not file:
        return True  # Optional file
    
    # Check extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False
    
    # Check content type
    if not file.content_type.startswith('image/'):
        return False
    
    return True


async def save_product_image(file: UploadFile) -> tuple[str, str]:
    """Save uploaded image and return (url, filename)"""
    # Generate unique filename
    ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return URL and filename
    image_url = f"/uploads/products/{unique_filename}"
    return image_url, unique_filename


async def delete_product_image(image_filename: str):
    """Delete product image file"""
    if image_filename:
        file_path = UPLOAD_DIR / image_filename
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception as e:
                print(f"Failed to delete image {image_filename}: {e}")


@router.get("", response_model=schema.ProductsResponse)
async def get_products(db: AsyncSession = Depends(get_db)):
    """Get all products"""
    products = await crud.get_products(db)
    return {"products": products, "total": len(products)}


@router.get("/{product_id}", response_model=schema.ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific product by ID"""
    product = await crud.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )
    return product


@router.post("", response_model=schema.ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    price: float = Form(...),
    quantity: int = Form(-1),
    category_id: Optional[int] = Form(None),
    is_active: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    """Create a new product with optional image"""
    
    # Check if product with same title exists
    existing = await crud.get_product_by_title(db, title)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product with this title already exists",
        )
    
    # Validate category if provided
    if category_id:
        from crud import categories as cat_crud
        category = await cat_crud.get_category_by_id(db, category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with id {category_id} not found",
            )
    
    # Validate and save image if provided
    image_url = None
    image_filename = None
    
    if image and image.filename:
        if not validate_image(image):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image. Allowed: {', '.join(ALLOWED_EXTENSIONS)}, Max size: 5MB"
            )
        
        # Check file size
        image.file.seek(0, 2)  # Seek to end
        file_size = image.file.tell()
        image.file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size: 5MB"
            )
        
        image_url, image_filename = await save_product_image(image)
    
    # Create product data
    product_data = schema.ProductCreate(
        title=title,
        description=description,
        price=price,
        quantity=quantity,
        category_id=category_id,
        is_active=is_active,
        image_url=image_url,
        image_filename=image_filename
    )
    
    return await crud.create_product(db, product_data)


@router.put("/{product_id}", response_model=schema.ProductResponse)
async def update_product(
    product_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    quantity: Optional[int] = Form(None),
    category_id: Optional[int] = Form(None),
    is_active: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    remove_image: bool = Form(False),
    db: AsyncSession = Depends(get_db),
):
    """Update a product with optional image upload or removal"""
    
    # Get existing product
    existing_product = await crud.get_product_by_id(db, product_id)
    if not existing_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )
    
    # Check if product title is being changed and if new title exists
    if title and title != existing_product.title:
        title_exists = await crud.get_product_by_title(db, title)
        if title_exists and title_exists.id != product_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product with this title already exists",
            )
    
    # Validate category if being updated
    if category_id:
        from crud import categories as cat_crud
        category = await cat_crud.get_category_by_id(db, category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with id {category_id} not found",
            )
    
    # Handle image update
    image_url = existing_product.image_url
    image_filename = existing_product.image_filename
    
    # Remove old image if requested
    if remove_image and image_filename:
        await delete_product_image(image_filename)
        image_url = None
        image_filename = None
    
    # Upload new image if provided
    if image and image.filename:
        if not validate_image(image):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image. Allowed: {', '.join(ALLOWED_EXTENSIONS)}, Max size: 5MB"
            )
        
        # Check file size
        image.file.seek(0, 2)
        file_size = image.file.tell()
        image.file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: 5MB"
            )
        
        # Delete old image
        if image_filename:
            await delete_product_image(image_filename)
        
        # Save new image
        image_url, image_filename = await save_product_image(image)
    
    # Build update data (only include provided fields)
    update_data = {}
    if title is not None:
        update_data['title'] = title
    if description is not None:
        update_data['description'] = description
    if price is not None:
        update_data['price'] = price
    if quantity is not None:
        update_data['quantity'] = quantity
    if category_id is not None:
        update_data['category_id'] = category_id
    if is_active is not None:
        update_data['is_active'] = is_active
    
    # Always update image fields (could be None if removed)
    update_data['image_url'] = image_url
    update_data['image_filename'] = image_filename
    
    product_update = schema.ProductUpdate(**update_data)
    updated = await crud.update_product(db, product_id, product_update)
    
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )
    
    return updated


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a product and its image"""
    
    # Get product to find image
    product = await crud.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )
    
    # Delete image if exists
    if product.image_filename:
        await delete_product_image(product.image_filename)
    
    # Delete product
    deleted = await crud.delete_product(db, product_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )


@router.get("/images/{filename}")
async def get_product_image(filename: str):
    """Serve product image"""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    return FileResponse(
        file_path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=31536000"}
    )