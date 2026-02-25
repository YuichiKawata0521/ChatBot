from datetime import datetime

def build_user_request(payload: dict) -> str:
    current_date = datetime.now().strftime("%Y-%m-%d")
    formatted = f"""
    ユーザーからヒアリングした情報を元に、テンプレートを埋めて初期ドラフトを作成してください。

    【ヒアリング結果(ユーザーからの情報】

    """

    for key, answer in payload.items():
        formatted += f"### {key}\n{answer}\n\n"

    formatted += """
    - ヒアリングで「特になし」や言及がなかった詳細項目(API仕様、データ要件、テスト要件など)は、システムの目的にあわせてあなた(AI)が専門的な視点から推測し、最適な内容で仮埋めしてください。
    - テンプレートの構造や項目は**絶対に**削除、変更しないでください。
    """
    return formatted