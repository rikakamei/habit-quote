from sqlalchemy.orm import Session
from datetime import date as date_type
import models, schemas
import httpx
import os
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

async def fetch_quote_and_translate():
    # --- 1. dummyjsonから名言取得 ---
    async with httpx.AsyncClient() as client:
        try:
            quote_resp = await client.get("https://dummyjson.com/quotes/random")
            quote_resp.raise_for_status()
            quote_data = quote_resp.json()
            text_to_translate = quote_data["quote"]
            author_to_translate = quote_data["author"]
        except httpx.RequestError as e:
            print(f"Error fetching quote from dummyjson: {e}")
            raise

    # --- 2. Geminiに投げる ---
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}"
    prompt = (
        '以下の英語の名言と作者名を自然な日本語に翻訳してください。'
        '結果は必ず下記のJSON形式で、他のテキストは一切含めずに返してください。\n'
        '{"quote": "翻訳された名言","author": "翻訳された作者名"}\n'
        f'---Text: "{text_to_translate}"\nAuthor: "{author_to_translate}"'
    )
    request_body = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(api_url, headers={"Content-Type": "application/json"}, json=request_body)
            resp.raise_for_status()
            data = resp.json()
            response_text = data["candidates"][0]["content"]["parts"][0]["text"]
        except httpx.RequestError as e:
            print(f"Error calling Gemini API: {e}")
            raise

    # --- 3. JSON部分を抽出 ---
    try:
        start_index = response_text.find("{")
        end_index = response_text.rfind("}")

        if start_index == -1 or end_index == -1:
            raise ValueError(f"Gemini応答にJSONが見つかりませんでした: {response_text}")

        json_string = response_text[start_index:end_index + 1]
        translated_data = httpx.Response(200, text=json_string).json()
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        raise

    # ▼▼▼ 変更点2: 戻り値のキーをschemas.QuoteCreateに合わせる ▼▼▼
    return {
        "quote_en": text_to_translate,
        "quote_ja": translated_data["quote"],
        "author": author_to_translate, # 英語の著者名をそのまま使う
    }

# --- Item (変更なし) ---
def get_item(db: Session, item_id: int):
    return db.query(models.Item).filter(models.Item.id == item_id).first()

def get_items(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Item).offset(skip).limit(limit).all()

def create_item(db: Session, item: schemas.ItemCreate):
    db_item = models.Item(
        title=item.title,
        is_custom=item.is_custom,
        persistent=item.persistent  # persistentフラグをDB保存
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

# --- Achievement (変更なし) ---
def get_achievement_by_date(db: Session, date: date_type):
    return db.query(models.Achievement).filter(models.Achievement.date == date).first()

async def create_new_quote_for_achievement(db: Session, achievement_id: int):
    """
    新しい名言を1つ取得し、指定された実績(achievement)に紐づけて保存する
    """
    # 1. 外部APIから名言を1つ取得・翻訳
    quote_data = await fetch_quote_and_translate()
    
    if quote_data:
        # 2. Pydanticスキーマでバリデーション
        quote_schema = schemas.QuoteCreate(**quote_data)
        
        # 3. DBモデルを作成して保存
        db_quote = models.Quote(
            **quote_schema.model_dump(),
            achievement_id=achievement_id
        )
        db.add(db_quote)
        db.commit()
        db.refresh(db_quote)
        return db_quote
    
    return None

def upsert_achievement(db: Session, record: schemas.AchievementRecordIn):
    db_achievement = get_achievement_by_date(db, record.date)
    if not db_achievement:
        db_achievement = models.Achievement(date=record.date)
        db.add(db_achievement)
        db.flush()

    db.query(models.AchievementItem).filter(
        models.AchievementItem.achievement_id == db_achievement.id
    ).delete()

    completed_count = 0
    for item_status in record.items:
        # item_id: 0（仮persistentタスク）はDB検索・保存をスキップ
        if item_status.item_id == 0:
            if item_status.status:
                completed_count += 1
            continue
        # 送られてきたitem_idが存在するか確認
        item = get_item(db, item_id=item_status.item_id)
        if not item:
            db.rollback()
            raise ValueError(f"Item with id {item_status.item_id} not found")
        if item_status.status:
            completed_count += 1
        db_achievement_item = models.AchievementItem(
            achievement_id=db_achievement.id,
            item_id=item_status.item_id,
            status=item_status.status
        )
        db.add(db_achievement_item)
    db_achievement.completed_count = completed_count
    
    db.commit()
    db.refresh(db_achievement)
    return db_achievement


# --- Quote ---
# ▼▼▼ 変更点1: この関数を完成させる ▼▼▼
def create_achievement_quote(db: Session, achievement_id: int, quote: schemas.QuoteCreate):
    """指定されたachievementに紐づく名言を作成する"""
    db_quote = models.Quote(
        **quote.model_dump(),  # Pydanticモデルから辞書に変換して展開
        achievement_id=achievement_id
    )
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    return db_quote

def get_achievements_by_month(db: Session, year: int, month: int):
    """
    指定した年・月のAchievement一覧を返す
    """
    from sqlalchemy import extract
    achievements = db.query(models.Achievement).filter(
        extract('year', models.Achievement.date) == year,
        extract('month', models.Achievement.date) == month
    ).all()
    return achievements