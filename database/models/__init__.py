import enum
import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    CheckConstraint,
    Enum,
    Text,
    Numeric,
)

from database.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STAFF = "staff"
    CHEF = "chef"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    pin = Column(Integer, unique=False, nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.STAFF)
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.INACTIVE)
    work_status = Column(Enum(UserStatus), nullable=False, default=UserStatus.INACTIVE)
    last_login = Column(DateTime, nullable=False, default=datetime.datetime.now())


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    quantity = Column(
        Integer,
        nullable=False,
        default=-1,
    )
    price = Column(
        Numeric(10, 2),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("price > 0", name="check_price_positive"),
        CheckConstraint("quantity >= -1", name="check_quantity_valid"),
    )
