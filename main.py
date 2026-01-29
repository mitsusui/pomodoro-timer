def main():
    print("Hello from pomodoro-timer!")


if __name__ == "__main__":
    main()
    from plyer import notification

    notification.notify(
        title='作業完了',
        message='ポモドーロの作業が完了しました。休憩しましょう！',
        timeout=5
    )