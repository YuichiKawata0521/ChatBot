// パスワード変更処理のスクリプト
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorMessage = document.getElementById('errorMessage');
            
            // URLからトークンを取得
            const pathParts = window.location.pathname.split('/');
            const token = pathParts[pathParts.length - 1];

            const formData = {
                token: token,
                employee_no: document.getElementById('employee_no').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            };

            try {
                // 別途実装したパスワードリセットAPIへ送信
                const response = await fetch('/api/v1/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();
                
                if (data.success) {
                    alert('パスワード変更が完了しました。ログインしてください。');
                    window.location.href = '/login'; // ログイン画面等のパスへ
                } else {
                    errorMessage.textContent = data.message || 'エラーが発生しました';
                }
            } catch (err) {
                console.error(err);
                errorMessage.textContent = '通信エラー';
            }
        });