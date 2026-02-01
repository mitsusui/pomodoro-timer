import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from datetime import datetime, date, timedelta
from typing import Optional
from sqlmodel import Field, Session, SQLModel, create_engine, select

# 1. DBのモデル（設計図）を作成
class PomodoroLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.now)
    task_name: str = "集中セッション"

# 目標: ポモドーロを何周完了するか（定数）
POMODORO_GOAL_ROUNDS = 5

# 2. DBへの接続設定
# postgres://ユーザー:パスワード@場所:ポート/DB名
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)


# 3. テーブルがなければ作成する（起動時に実行）
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    # index.htmlを読み込んで表示
    return templates.TemplateResponse("index.html", {"request": request})

    # main.py に追加
@app.post("/notify")
async def send_notification():
    # --- DBに保存する処理 ---
    with Session(engine) as session:
        log = PomodoroLog()
        session.add(log)
        session.commit()
    
    # --- 既存の通知処理 ---
    from plyer import notification
    notification.notify(title="完了！", message="DBに記録しました。")
    
    return {"status": "success"}


@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/logs")
async def get_logs():
    """当日完了したポモドーロの回数と完了時刻(hh:mm:ss)を返す"""
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = today_start + timedelta(days=1)
    with Session(engine) as session:
        rows = session.exec(
            select(PomodoroLog)
            .where(PomodoroLog.timestamp >= today_start, PomodoroLog.timestamp < today_end)
            .order_by(PomodoroLog.timestamp)
        ).all()
        completed_times = [r.timestamp.strftime("%H:%M:%S") for r in rows]
    return {
        "goal_rounds": POMODORO_GOAL_ROUNDS,
        "completed_count": len(completed_times),
        "completed_times": completed_times,
    }