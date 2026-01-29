from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
async def read_items():
    return """
    <html>
        <head><title>Pomodoro Timer</title></head>
        <body>
            <h1>ポモドーロタイマー作成開始！</h1>
            <p>ここをフロントエンド（HTML/CSS）にしていきます。</p>
        </body>
    </html>
    """