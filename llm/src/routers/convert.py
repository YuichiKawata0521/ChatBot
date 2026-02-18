import os
import tempfile
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from src.services.convert_service import convert_service

router = APIRouter()

@router.post("/convert")
async def convert_document(file: UploadFile = File(...)):
    # 一時ファイルを作成して保存
    # doclingはファイルパスを受け取る仕様が基本のため
    suffix = os.path.splitext(file.filename)[1]
    
    # 拡張子が空の場合はデフォルトで安全なものにするか、エラーにするなど調整可能
    if not suffix:
        suffix = ".tmp"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        try:
            # アップロードされたファイルの内容を一時ファイルに書き込む
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        except Exception as e:
            os.unlink(tmp_file.name) # エラー時は即削除
            raise HTTPException(status_code=500, detail=f"File save failed: {str(e)}")

    try:
        # 変換処理を実行
        markdown_text = convert_service.convert_file(tmp_file_path)
        
        return {
            "success": True,
            "filename": file.filename,
            "markdown": markdown_text
        }
    except Exception as e:
        print(f"Conversion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        # 処理完了後、一時ファイルを削除
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)