# models.py
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Date, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    is_custom = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    persistent = Column(Boolean, default=False)  # ← 追加
    achievement_items = relationship("AchievementItem", back_populates="item")

class Achievement(Base):
    __tablename__ = "achievements"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True)
    completed_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    items = relationship("AchievementItem", back_populates="achievement")
    quotes = relationship("Quote", back_populates="achievement")

## 中間テーブル
class AchievementItem(Base):
    __tablename__ = "achievement_items"
    id = Column(Integer, primary_key=True, index=True)
    achievement_id = Column(Integer, ForeignKey("achievements.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    status = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    achievement = relationship("Achievement", back_populates="items")
    item = relationship("Item", back_populates="achievement_items")

class Quote(Base):
    __tablename__ = "quotes"
    id = Column(Integer, primary_key=True, index=True)
    achievement_id = Column(Integer, ForeignKey("achievements.id"))
    quote_en = Column(String)
    quote_ja = Column(String)
    author = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    
    achievement = relationship("Achievement", back_populates="quotes")