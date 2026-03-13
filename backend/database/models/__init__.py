import enum
import json

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STAFF = "staff"
    CHEF = "chef"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class TableStatus(str, enum.Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"


class BusinessType(str, enum.Enum):
    RESTAURANT = "restaurant"
    MARKET = "market"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    pin = Column(Integer, nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.STAFF)
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.INACTIVE)
    work_status = Column(Enum(UserStatus), nullable=False, default=UserStatus.INACTIVE)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    orders = relationship("Order", back_populates="user", lazy="dynamic")
    __table_args__ = (
        CheckConstraint("pin>=1000 AND pin<=999999", name="check_pin_range"),
    )


class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    title = Column(String(200), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    category_id = Column(
        Integer,
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    quantity = Column(Integer, nullable=False, default=-1)
    price = Column(Numeric(10, 2), nullable=False)
    image_url = Column(String(500), nullable=True)
    image_filename = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    __table_args__ = (
        CheckConstraint("price>0", name="check_price_positive"),
        CheckConstraint("quantity>=-1", name="check_quantity_valid"),
    )


class Table(Base):
    __tablename__ = "tables"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    number = Column(String(20), unique=True, nullable=False, index=True)
    subcategory = Column(String(100), nullable=True, index=True)
    location = Column(String(100), nullable=True, index=True)
    capacity = Column(Integer, nullable=False, default=4)
    status = Column(
        Enum(TableStatus), nullable=False, default=TableStatus.AVAILABLE, index=True
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    orders = relationship("Order", back_populates="table")
    __table_args__ = (CheckConstraint("capacity>0", name="check_capacity_positive"),)


class SystemConfig(Base):
    __tablename__ = "system_config"
    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(50), unique=True, nullable=False, index=True)
    value = Column(String(100), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class PrinterConfig(Base):
    __tablename__ = "printer_configs"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False, default=9100)
    categories = Column(Text, nullable=False, default="[]")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    table_id = Column(
        Integer, ForeignKey("tables.id", ondelete="SET NULL"), nullable=True, index=True
    )
    total = Column(Float, default=0.0, nullable=False)
    status = Column(
        Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True
    )
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    user = relationship("User", back_populates="orders")
    table = relationship("Table", back_populates="orders")
    items = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="joined"
    )
    __table_args__ = (CheckConstraint("total>=0", name="check_total_non_negative"),)

    def _notes_meta(self) -> dict:
        if not self.notes:
            return {}
        try:
            data = json.loads(self.notes)
            return data if isinstance(data, dict) else {}
        except (TypeError, ValueError):
            return {}

    def _set_notes_meta(self, meta: dict) -> None:
        cleaned = {k: v for k, v in meta.items() if v is not None}
        self.notes = json.dumps(cleaned) if cleaned else None

    @property
    def subtotal_amount(self) -> float:
        return float(sum(float(item.subtotal) for item in self.items))

    @property
    def fee_percent(self) -> float:
        return float(self._notes_meta().get("fee_percent", 0.0) or 0.0)

    @fee_percent.setter
    def fee_percent(self, value) -> None:
        fee_value = round(float(value or 0.0), 2)
        meta = self._notes_meta()
        if fee_value > 0:
            meta["fee_percent"] = fee_value
        else:
            meta.pop("fee_percent", None)
        self._set_notes_meta(meta)

    @property
    def fee_amount(self) -> float:
        return round(self.subtotal_amount * self.fee_percent / 100, 2)

    def calculate_total(self):
        self.total = round(self.subtotal_amount + self.fee_amount, 2)
        return self.total


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    order_id = Column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
    __table_args__ = (
        CheckConstraint("quantity>0", name="check_quantity_positive"),
        CheckConstraint("price>0", name="check_price_positive_item"),
        CheckConstraint("subtotal>=0", name="check_subtotal_non_negative"),
    )

    def calculate_subtotal(self):
        self.subtotal = self.price * self.quantity
        return self.subtotal
