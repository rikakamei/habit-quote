from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from sqlalchemy.orm import Session
from datetime import date as date_type
import schemas
import models
import crud
from database import get_db, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "じぶん記録アプリAPIへ"}

# --- Item (変更なし) ---
@app.get("/items", response_model=List[schemas.Item])
def read_items(db: Session = Depends(get_db)):
    items = crud.get_items(db)
    return items

@app.post("/items", response_model=schemas.Item)
def create_item(item: schemas.ItemCreate, db: Session = Depends(get_db)):
    return crud.create_item(db=db, item=item)

# --- Achievement (GETは変更なし) ---
@app.get("/achievements/{date}", response_model=schemas.Achievement)
def read_achievement_by_date(date: date_type, db: Session = Depends(get_db)):
    db_achievement = crud.get_achievement_by_date(db, date=date)
    if db_achievement is None:
        raise HTTPException(status_code=404, detail="指定された日付の記録は見つかりません")
    return db_achievement

@app.get("/achievements", response_model=List[schemas.AchievementCalendar])
def read_achievements_by_month(month: str = Query(..., description="YYYY-MM形式"), db: Session = Depends(get_db)):
    """
    指定月の全ての達成記録を返す（例: /achievements?month=2025-09）
    """
    year, month_num = map(int, month.split("-"))
    achievements = crud.get_achievements_by_month(db, year, month_num)
    # カレンダー用に日付とcompleted_countのみ返す
    return [schemas.AchievementCalendar(date=a.date, completed_count=a.completed_count) for a in achievements]

# POST /achievements : タスク達成を記録し、名言も取得・保存する
@app.post("/achievements", response_model=schemas.Achievement)
def create_or_update_achievement(record: schemas.AchievementRecordIn, db: Session = Depends(get_db)):
    """
    タスクの達成状況を保存/更新し、名言を見られる権利の数を返す
    """
    # 1. タスク達成状況をDBに保存・更新
    db_achievement = crud.upsert_achievement(db=db, record=record)
    
    # 2. フロントに返すために、今回完了したタスクの数を計算
    #    (upsert_achievementが返すcompleted_countは、その日の累計なので、今回増えた分を計算する)
    #    シンプルにするため、ここでは累計の数をそのまま権利の数として扱う
    #    より厳密にするなら、更新前の完了数との差分を計算する必要がある
    newly_completed_count = db_achievement.completed_count

    # 3. スキーマに残り回数をセットして返す
    #    注意：この時点ではDBに名言は保存されない
    db_achievement.quote_chances = newly_completed_count

    return db_achievement
# ▲▲▲ ここまで ▲▲▲

@app.post("/achievements/quotes", response_model=schemas.Quote)
async def create_quote_for_achievement(achievement_id: int, db: Session = Depends(get_db)):
    """
    指定された実績IDに対して、新しい名言を1つだけ取得・保存し、その名言を返す
    """
    db_achievement = db.query(models.Achievement).filter(models.Achievement.id == achievement_id).first()
    if not db_achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")

    # 新しい名言を1つ作成するCRUD関数を呼び出す
    new_quote = await crud.create_new_quote_for_achievement(db=db, achievement_id=achievement_id)
    
    if not new_quote:
        raise HTTPException(status_code=500, detail="Failed to fetch a new quote")

    return new_quote

@app.post("/achievements/{achievement_id}/quotes", response_model=schemas.Quote)
def create_quote_for_achievement(achievement_id: int, quote: schemas.QuoteCreate, db: Session = Depends(get_db)):
    return crud.create_achievement_quote(db=db, achievement_id=achievement_id, quote=quote)