from pydantic import BaseModel
from datetime import datetime, date
from typing import List, Optional

# --- Item ---
class ItemBase(BaseModel):
    title: str
    is_custom: bool = True

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# --- Quote ---
class QuoteBase(BaseModel):
    quote_en: str
    quote_ja: str
    author: str

class QuoteCreate(QuoteBase):
    pass

class Quote(QuoteBase):
    id: int
    class Config:
        from_attributes = True

# --- AchievementItem ---
class AchievementItemBase(BaseModel):
    item_id: int
    status: bool
    persistent: Optional[bool] = False  # 追加: persistentタスクかどうか

class AchievementItemCreate(AchievementItemBase):
    pass
    
class AchievementItem(AchievementItemBase):
    id: int
    item: Item # 関連するItemの情報も返すようにする
    class Config:
        from_attributes = True

# --- Achievement ---
class AchievementBase(BaseModel):
    date: date

class AchievementCreate(AchievementBase):
    pass

class Achievement(AchievementBase):
    id: int
    completed_count: int
    items: List[AchievementItem] = [] # その日のタスク達成状況
    quotes: List[Quote] = []         # その日の名言
    quote_chances: int = 0 

    class Config:
        from_attributes = True

# POST /achievements で受け取るためのスキーマ
class AchievementRecordIn(BaseModel):
    date: date
    items: List[AchievementItemBase]  # persistentフラグも受け取る

# 月別カレンダー用の簡易レスポンス
class AchievementCalendar(BaseModel):
    date: date
    completed_count: int