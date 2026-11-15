from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint
)
from sqlalchemy.orm import relationship

from database import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    college = Column(String(200), nullable=False)
    branch = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    profile = relationship(
        "Profile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    bio = Column(Text, default="")
    skills_offered = Column(Text, default="")
    skills_wanted = Column(Text, default="")
    project_interests = Column(Text, default="")
    availability = Column(String(50), default="Flexible")
    avatar = Column(String(10), default="YU")

    user = relationship("User", back_populates="profile")


class Swipe(Base):
    __tablename__ = "swipes"

    id = Column(Integer, primary_key=True, index=True)

    from_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    to_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    liked = Column(Boolean, nullable=False)

    created_at = Column(
        DateTime,
        default=utc_now,
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "from_user_id",
            "to_user_id",
            name="unique_swipe_pair"
        ),
    )


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)

    user1_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    user2_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=utc_now,
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "user1_id",
            "user2_id",
            name="unique_match_pair"
        ),
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    match_id = Column(
        Integer,
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    sender_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    message = Column(
        Text,
        nullable=False
    )

    is_read = Column(
        Boolean,
        default=False
    )

    created_at = Column(
        DateTime,
        default=utc_now,
        nullable=False
    )