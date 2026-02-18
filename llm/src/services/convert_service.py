from docling.document_converter import DocumentConverter

class ConvertService:
    def __init__(self):
        self.converter = None

    def _get_converter(self):
        if self.converter is None:
            self.converter = DocumentConverter()
        return self.converter

    def convert_file(self, file_path: str) -> str:
        """
        指定されたパスのファイルを読み込み、Markdown形式のテキストを返す
        """
        converter = self._get_converter()
        result = converter.convert(file_path)
        # Markdownとしてエクスポート
        return result.document.export_to_markdown()

convert_service = ConvertService()