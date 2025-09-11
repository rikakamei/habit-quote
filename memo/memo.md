# インターン　
・何がしたい
・どんなことに困っている
・私が作るものを使うとどのように解決できるか
・イメージを作成

やること
1. Modelについて列を定義して文書に起こす
2. APIの方もパス、メソッド、パラメータ、レスポンス（RESTful）

ユーザーごとに分けない、私が使うだけ想定でModelのカラムを設定した場合。
①
- Item
やったことのid(int/UUID)/やったことのtitle(string)/新しく追加されたものかどうかis_custom(boolean)/作成日時created_at(datetime)/更新日時updated_at(datetime)

- Achievement
主キーid(int/UUID)/日付date(int)/達成した項目の数completed_count(int) /作成日時created_at(datetime)/更新日時updated_at(datetime)

- Quote
主キーid(int/UUID)/どの日の達成かachievement_id(FK → Achievement.id)/英語の名言quote_en(string)/日本語の名言quote_jp(string)/作者author(string) /作成日時created_at(datetime)

- 中間テーブル
主キーid(int/UUID)/どの日の記録なのかachievement_id(FK → Achievement.id)/どのタスクなのかitem_id(FK → Item.id)/達成したのかどうかstatus(boolean) /作成日時created_at(datetime)/更新日時updated_at(datetime)


中間テーブルってどうしているの？

一つのカラムに複数の要素を持つことは構造上できない。
かといって、テーブルを全ての要素について持てるようにすると、使われない空のカラムができてしまう。
そこで、テーブル間のお互いのidを外部キーとして持つ中間テーブルを使用することで空のカラムを持たなくても多対多の関係を扱うことができる。
今回の多対多
Item と　Achievement
例）歯磨きした→8/22,8/23,8/24（複数）
8/22の達成→歯磨きした、お風呂に入った、ジムに行った（複数）

```
Achievement (日付記録)
   id (PK)
   date
      │
      │ 1 : 多
      │
AchievementItem (中間テーブル)
   achievement_id (FK → Achievement.id)
   item_id        (FK → Item.id)
   is_done
      │
      │ 多 : 1
      │
Item (タスク)
   id (PK)
   name
```

② APIの方もパス、メソッド、パラメータ、レスポンス（RESTful）

 
習慣記録アプリ API仕様書（個人用版）
 
1. 名言を取得する
パス:
GET /achievements/{achievement_id}/quotes
説明:
指定日の名言ログを取得する。
パラメータ:
名前	in	型	必須	説明
achievement_id	path	int	Yes	取得したい日次記録のID
レスポンス:
•	ステータス: 200 OK
•	例:
[
  {
    "id": 1,
    "quote_en": "Do one thing every day that scares you.",
    "quote_ja": "毎日あなたを怖がらせることをひとつやりなさい。",
    "author": "Eleanor Roosevelt"
  },
  {
    "id": 2,
    "quote_en": "Success is not final, failure is not fatal.",
    "quote_ja": "成功は最終ではなく、失敗は致命的ではない。",
    "author": "Winston Churchill"
  }
]
 
2. 日毎に達成Item数を取得する
パス:
GET /achievements/{date}
説明:
指定日の達成タスク数を取得する。
パラメータ:
名前	in	型	必須	説明
date	path	string (YYYY-MM-DD)	Yes	取得対象の日付
レスポンス:
•	ステータス: 200 OK
•	例:
{
  "id": 10,
  "date": "2025-08-22",
  "completed_count": 2
}
 
3. Itemを追加する
パス:
POST /items
説明:
新しいタスクを追加する。
パラメータ:
•	リクエストボディ:
{
  "title": "瞑想",
  "is_custom": true
}
レスポンス:
•	ステータス: 201 Created
•	例:
{
  "id": 3,
  "title": "瞑想",
  "is_custom": true
}
 
4. Itemが達成したのを記録する
パス:
POST /achievements
説明:
日付ごとのタスク達成状況をまとめて記録する。
パラメータ:
•	リクエストボディ:
{
  "date": "2025-08-22",
  "tasks": [
    {"item_id": 1, "status": true},
    {"item_id": 2, "status": false},
    {"item_id": 3, "status": true}
  ]
}
レスポンス:
•	ステータス: 201 Created
•	例:
{
  "id": 10,
  "date": "2025-08-22",
  "completed_count": 2
}
 
5. 日毎に達成したItemとその日に見た名言を取得する
パス:
GET /achievements/{date}/details
説明:
指定日の達成タスクと名言ログをまとめて取得する。
パラメータ:
名前	in	型	必須	説明
date	path	string (YYYY-MM-DD)	Yes	取得対象の日付
レスポンス:
•	ステータス: 200 OK
•	例:
{
  "date": "2025-08-22",
  "completed_count": 2,
  "items": [
    {"id": 1, "title": "運動", "status": true},
    {"id": 2, "title": "読書", "status": false},
    {"id": 3, "title": "瞑想", "status": true}
  ],
  "quotes": [
    {
      "id": 1,
      "quote_en": "Do one thing every day that scares you.",
      "quote_ja": "毎日あなたを怖がらせることをひとつやりなさい。",
      "author": "Eleanor Roosevelt"
    }
  ]
}
 

[React Frontend] (客席)
       |
<APIリクエスト> (注文)
       |
       v
[1. main.py] (ホール担当のウェイター)
   - リクエストを受け取り、どの処理に回すか判断
   - `schemas.py`(メニュー)で注文内容が正しいか確認
   - `crud.py`(シェフ)に調理を依頼
       |
       v
[2. crud.py] (調理を担当するシェフ)
   - `main.py`から依頼を受け、具体的なデータベース操作を行う
   - `models.py`(レシピ本)を見て、どの材料(テーブル)をどう扱うか知る
   - `database.py`(厨房への扉)を通じて、倉庫とのやり取りを準備
       |
       v
[3. models.py] (レシピ本)
   - 材料(データ)の構造や、材料同士の関係(リレーション)を定義
   - `crud.py`が調理法を確認するために参照する
       |
       v
[4. database.py] (厨房と倉庫をつなぐ扉)
   - `habit_quote.db`(倉庫)への接続を管理
   - シェフが倉庫に入れるように、合鍵(セッション)を提供する
       |
       v
[5. habit_quote.db] (食材倉庫)
   - 実際のデータが保管されている場所 (SQLiteファイル)

[設定ファイル: .env] (倉庫の住所が書かれたメモ)
各ファイルの詳細な役割
1. main.py (ウェイター / APIの玄関口)
役割: FastAPIアプリケーションの本体です。外部（今回はReact）からのHTTPリクエスト（GET /itemsなど）を最初に受け取ります。

関係:

リクエストが来ると、どのエンドポイント（@app.get(...)など）に対応するかを判断します。

データの検証のためにschemas.pyを使います。

実際のデータベース処理は自分で行わず、crud.pyに依頼します。

database.pyのget_dbを使って、データベースとの接続（セッション）を取得します。

2. schemas.py (メニュー / データの設計図)
役割: APIが送受信するデータの「型」や「形式」を定義するファイルです（Pydanticモデル）。例えば、「タスクを作成するリクエストにはtitleという文字列が必須」といったルールを定めます。

関係:

main.pyがリクエストを受け取ったり、レスポンスを返したりする際に、データの形式が正しいか検証するために使われます。

crud.pyも、データベースとやり取りするデータの形式を確認するために使います。

3. crud.py (シェフ / データベース操作係)
役割: データベースに対する具体的な操作（Create, Read, Update, Delete）を行う関数をまとめたファイルです。APIのロジックとデータベースのロジックを分離し、コードを綺麗に保つ役割があります。

関係:

main.pyの各エンドポイントから呼び出されます。

models.pyに定義されたテーブル構造（クラス）を使って、データベースを操作（クエリ）します。

データベースとの接続（セッション）はdatabase.pyから受け取ります。

4. models.py (レシピ本 / データベースのテーブル定義)
役割: データベースの中にどのようなテーブル（items, achievementsなど）が存在し、各テーブルがどのような列（id, titleなど）を持つかを、Pythonのクラスとして定義します。テーブル同士の関係性（リレーション）もここで定義します。

関係:

crud.pyが、どのようなSQLクエリを発行するかを判断するために、このファイルのクラス定義を参照します。

アプリケーション初回起動時にmain.pyがこのファイルを読み込み、habit_quote.db内にテーブルを自動作成します。

5. database.py, .env, habit_quote.db (倉庫と接続周り)
database.py: データベースへの接続設定や、接続そのもの（セッション）を提供するユーティリティファイルです。

.env: データベースファイルの場所(DATABASE_URL)など、直接コードに書き込みたくない設定情報を記述するファイルです。

habit_quote.db: これがデータベース本体です。 あなたが追加したタスクなどの全てのデータが、このファイルの中に実際に保存されていきます。



