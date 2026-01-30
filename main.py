from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

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
    from plyer import notification
    try:
        notification.notify(
            title="Pomodoro Timer",
            message="お疲れ様です！セッションが終了しました。",
            timeout=5
        )
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}