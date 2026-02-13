// パスワード変更処理のスクリプト
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorMessage = document.getElementById('errorMessage');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    const formData = {
        token: token,
        password: document.getElementById('password').value
    };

    try {
        // 別途実装したパスワードリセットAPIへ送信
        const response = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await response.json();
        
        if (data.success) {
            alert('パスワード変更が完了しました。メインページへ移動します');
            window.location.href = '/chat'; // ログイン画面等のパスへ
        } else {
            errorMessage.textContent = data.message || 'エラーが発生しました';
        }
    } catch (err) {
        console.error(err);
        errorMessage.textContent = '通信エラー';
    }
});
