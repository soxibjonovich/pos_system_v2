from typing import Sequence
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import User, UserRole, UserStatus
from schemas import users as schema
from rabbitmq_client import rabbitmq_client


async def get_users(db: AsyncSession) -> Sequence[User]:
    result = await db.execute(select(User))
    return result.scalars().all()


async def get_usernames(db: AsyncSession, status: str) -> Sequence[str]:
    if not status:
        return []

    target_status = status.strip().upper()

    result = await db.execute(
        select(User.username).where(func.upper(func.trim(User.status)) == target_status)
    )

    return result.scalars().all()


async def get_user_by_id(db: AsyncSession, id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == id))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user: schema.UserCreate) -> User:
    new_user = User(**user.model_dump())
    db.add(new_user)

    try:
        await db.commit()
        await db.refresh(new_user)

        # Publish RabbitMQ event
        try:
            await rabbitmq_client.publish(
                "user.created",
                {
                    "action": "created",
                    "user_id": new_user.id,
                    "username": new_user.username,
                    "role": new_user.role.value
                    if isinstance(new_user.role, UserRole)
                    else new_user.role,
                    "status": new_user.status.value
                    if isinstance(new_user.status, UserStatus)
                    else new_user.status,
                },
            )
        except Exception as e:
            print(f"⚠️  Failed to publish user.created event: {e}")

        return new_user
    except Exception:
        await db.rollback()
        raise


async def update_user(
    db: AsyncSession, id: int, user: schema.UserUpdate
) -> User | None:
    existing_user = await get_user_by_id(db, id)
    if not existing_user:
        return None

    # Store old values for event BEFORE updating
    old_role = (
        existing_user.role.value
        if isinstance(existing_user.role, UserRole)
        else existing_user.role
    )
    old_status = (
        existing_user.status.value
        if isinstance(existing_user.status, UserStatus)
        else existing_user.status
    )

    for key, value in user.model_dump(exclude_unset=True).items():
        setattr(existing_user, key, value)

    try:
        await db.commit()
        await db.refresh(existing_user)

        # Publish RabbitMQ event
        try:
            current_role = (
                existing_user.role.value
                if isinstance(existing_user.role, UserRole)
                else existing_user.role
            )
            current_status = (
                existing_user.status.value
                if isinstance(existing_user.status, UserStatus)
                else existing_user.status
            )

            event_data = {
                "action": "updated",
                "user_id": existing_user.id,
                "username": existing_user.username,
                "role": current_role,
                "status": current_status,
            }

            # Add role change info if role was updated
            if old_role != current_role:
                event_data["old_role"] = old_role
                event_data["new_role"] = current_role
                event_data["role_changed"] = True

            # Add status change info if status was updated
            if old_status != current_status:
                event_data["old_status"] = old_status
                event_data["new_status"] = current_status
                event_data["status_changed"] = True

            await rabbitmq_client.publish("user.updated", event_data)
        except Exception as e:
            print(f"⚠️  Failed to publish user.updated event: {e}")

        return existing_user
    except Exception:
        await db.rollback()
        raise


async def delete_user(db: AsyncSession, id: int) -> bool:
    user = await get_user_by_id(db, id)
    if not user:
        return False

    # Store user info for event
    user_id = user.id
    username = user.username
    role = user.role.value if isinstance(user.role, UserRole) else user.role

    try:
        await db.delete(user)
        await db.commit()

        # Publish RabbitMQ event
        try:
            await rabbitmq_client.publish(
                "user.deleted",
                {
                    "action": "deleted",
                    "user_id": user_id,
                    "username": username,
                    "role": role,
                },
            )
        except Exception as e:
            print(f"⚠️  Failed to publish user.deleted event: {e}")

        return True
    except Exception:
        await db.rollback()
        raise


async def update_role(db: AsyncSession, id: int, role: str) -> User | None:
    user = await get_user_by_id(db, id)
    if not user:
        return None

    old_role = user.role.value if isinstance(user.role, UserRole) else user.role
    user.role = role

    try:
        await db.commit()
        await db.refresh(user)

        # Publish RabbitMQ event
        try:
            new_role = user.role.value if isinstance(user.role, UserRole) else user.role
            await rabbitmq_client.publish(
                "user.role_updated",
                {
                    "action": "role_updated",
                    "user_id": user.id,
                    "username": user.username,
                    "old_role": old_role,
                    "new_role": new_role,
                },
            )
        except Exception as e:
            print(f"⚠️  Failed to publish user.role_updated event: {e}")

        return user
    except Exception:
        await db.rollback()
        raise


async def update_status(db: AsyncSession, id: int, status: UserStatus) -> User | None:
    user = await get_user_by_id(db, id)
    if not user:
        return None

    old_status = (
        user.status.value if isinstance(user.status, UserStatus) else user.status
    )
    user.status = status

    try:
        await db.commit()
        await db.refresh(user)

        # Publish RabbitMQ event
        try:
            new_status = (
                user.status.value
                if isinstance(user.status, UserStatus)
                else user.status
            )
            await rabbitmq_client.publish(
                "user.status_updated",
                {
                    "action": "status_updated",
                    "user_id": user.id,
                    "username": user.username,
                    "old_status": old_status,
                    "new_status": new_status,
                },
            )
        except Exception as e:
            print(f"⚠️  Failed to publish user.status_updated event: {e}")

        return user
    except Exception:
        await db.rollback()
        raise
