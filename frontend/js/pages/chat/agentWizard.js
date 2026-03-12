export class RequirementAgentWizard {
    constructor(onSubmit) {
        this.onSubmit = onSubmit; // 最終的にチャットに投げるコールバック関数
        this.currentStep = 0;
        this.answers = {}; // 回答を保持するオブジェクト

        // 提示いただいた15個の質問リスト（UIで扱いやすいようにラベルとテキストを分離）
        this.questions = [
            { id: 'creator', number: '1. 管理情報', label: '1. 管理情報', text: '要件定義書・仕様書の作成者の名前を教えてください。', type: 'text' },
            { id: 'purpose', number: '2. 目的',  label: '2.3 目的', text: '作成したいシステムの目的を教えてください。\n（例：社内ドキュメント検索チャットボット）', type: 'textarea' },
            { id: 'background', number: '3. 背景・現状分析',  label: '2.1 背景 / 5. 現状分析', text: '現在どのような課題や不満がありますか？', type: 'textarea' },
            { id: 'core_problem', number: '4. 根本問題',  label: '2.2 根本問題', text: 'このシステムで最も解決したい本質的な問題は何ですか？', type: 'textarea' },
            { id: 'kpi', number: '5. KPI',  label: '2.4 KPI', text: 'このシステムの定量的な成功指標（KPI）を教えてください。', type: 'text' },
            { id: 'kgi', number: '6. KGI',  label: '2.4 KGI', text: '最終的な成果指標（KGI）を教えてください。', type: 'text' },
            { id: 'target_user', number: '7. ステークホルダー',  label: '4. ステークホルダー', text: '主な利用者は誰ですか？（役割・人数規模）', type: 'textarea' },
            { id: 'core_features', number: '8. 機能要件(必須)',  label: '7.1 機能要件（必須）', text: '絶対に外せない必須機能（MVP機能）は何ですか？', type: 'textarea' },
            { id: 'additional_features', number: '9. 機能要件(追加)',  label: '7.1 機能要件（追加）', text: '追加したい機能があれば、High / Medium / Low で優先度を付けてください。', type: 'textarea' },
            { id: 'out_of_scope', number: '10. スコープ外',  label: '2.5 Out of Scope', text: 'このプロジェクトで「やらないこと」は何ですか？', type: 'textarea' },
            { id: 'constraints', number: '11. 制約条件',  label: '5.4 制約条件', text: '使用技術、クラウド、納期、予算など決まっている制約はありますか？', type: 'textarea' },
            { id: 'performance', number: '12. 性能',  label: '8.1 性能', text: '想定同時接続数、希望応答時間、想定トラフィック量を教えてください。', type: 'textarea' },
            { id: 'main_data', number: '13. データ要件',  label: '7.4 データ要件', text: 'このシステムで扱う主要なデータは何ですか？', type: 'textarea' },
            { id: 'auth_roles', number: '14. セキュリティ',  label: '8.3 セキュリティ', text: 'ログインは必要ですか？必要な場合、ユーザー権限の種類を教えてください。', type: 'textarea' },
            { id: 'integration', number: '15. 互換性',  label: '8.6 互換性', text: '他システムとの連携はありますか？\n（例：Slack、Salesforceなど）', type: 'textarea' }
        ];

        this.initDOM();
        this.bindEvents();
    }

    initDOM() {
        this.modal = document.getElementById('agent-modal');
        this.modalBody = document.getElementById('modal-body');
        this.btnNext = document.getElementById('modal-next-btn');
        this.btnBack = document.getElementById('modal-back-btn');
        this.btnSubmit = document.getElementById('modal-submit-btn');
        this.btnClose = document.getElementById('modal-close-btn');
        
        // 進捗状況を表示する要素（もしHTMLにあれば）
        this.progressText = document.getElementById('modal-progress');
    }

    bindEvents() {
        this.btnNext.addEventListener('click', () => this.nextStep());
        this.btnBack.addEventListener('click', () => this.prevStep());
        this.btnClose.addEventListener('click', () => this.close());
        this.btnSubmit.addEventListener('click', () => this.submit());
    }

    open() {
        this.currentStep = 0;
        this.modal.classList.remove('hidden');
        this.renderStep();
    }

    close() {
        this.modal.classList.add('hidden');
    }

    saveCurrentAnswer() {
        const input = document.getElementById('wizard-input');
        if (input && this.currentStep < this.questions.length) {
            const currentQ = this.questions[this.currentStep];
            this.answers[currentQ.id] = input.value.trim();
        }
    }

    nextStep() {
        this.saveCurrentAnswer();
        if (this.currentStep < this.questions.length) {
            this.currentStep++;
            this.renderStep();
        }
    }

    prevStep() {
        this.saveCurrentAnswer();
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderStep();
        }
    }

    jumpToStep(index) {
        this.saveCurrentAnswer();
        this.currentStep = index;
        this.renderStep();
    }

    renderStep() {
        this.modalBody.innerHTML = '';
        
        // 進捗表示の更新（例: 1/15）
        if (this.progressText) {
            this.progressText.textContent = this.currentStep < this.questions.length 
                ? `${this.currentStep + 1} / ${this.questions.length}` 
                : '確認画面';
        }

        // --- 確認画面 ---
        if (this.currentStep === this.questions.length) {
            this.btnNext.classList.add('hidden');
            this.btnSubmit.classList.remove('hidden');
            this.btnSubmit.textContent = '実行';

            let html = `
                <div class="wizard-confirm-note-box">
                    💡 空欄の項目は「特になし(AI側で定義)」として処理されます。問題なければ「実行」を押してください。
                </div>
                <div class="confirm-list">
            `;
            this.questions.forEach((q, index) => {
                const answer = this.answers[q.id] || '<span class="wizard-empty-answer">特になし(AI側で定義してください)</span>';
                html += `
                    <div class="confirm-item">
                        <div class="confirm-item-header">
                            <strong>${q.number}</strong>
                            <button class="edit-btn" data-index="${index}">修正する</button>
                        </div>
                        <div class="confirm-item-value wizard-confirm-item-value">${answer.replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            });
            html += `</div>`;
            this.modalBody.innerHTML = html;

            this.modalBody.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.jumpToStep(parseInt(e.target.dataset.index, 10));
                });
            });
            return;
        }

        // --- 質問画面 ---
        this.btnSubmit.textContent = '確認画面';

        const isLastQuestion = this.currentStep === this.questions.length - 1;
        this.btnNext.classList.toggle('hidden', isLastQuestion);
        this.btnSubmit.classList.remove('hidden');
        this.btnBack.classList.toggle('hidden', this.currentStep === 0);

        const q = this.questions[this.currentStep];
        const currentValue = this.answers[q.id] || '';

        // 説明文の改行を反映
        const formattedText = q.text.replace(/\n/g, '<br>');

        const inputHtml = q.type === 'textarea' 
            ? `<textarea id="wizard-input" class="answer-input" rows="6" placeholder="入力または空欄のまま次へ (Ctrl + Enterで次の質問へ)">${currentValue}</textarea>`
            : `<input type="text" id="wizard-input" class="answer-input" value="${currentValue}" placeholder="入力または空欄のまま次へ (Ctrl + Enterで次の質問へ)">`;

        this.modalBody.innerHTML = `
            <div class="wizard-question-number">${q.number}</div>
            <div class="question-text wizard-question-text">${formattedText}</div>
            ${inputHtml}
            <div class="wizard-question-help">※思いつく範囲でざっくりと回答してください。空欄で次へ進むとスキップ（AIにお任せ）になります。</div>
        `;

        const inputElement = document.getElementById('wizard-input');
        if (inputElement) {
            inputElement.addEventListener('keydown', (e) => {
                if (q.type === 'text' && e.key === 'Enter') {
                    e.preventDefault();
                    this.nextStep();
                    return;
                }

                if (q.type === 'textarea' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.nextStep();
                }
            });

            setTimeout(() => inputElement.focus(), 10);
        }
    }

    submit() {
        this.saveCurrentAnswer();

        if (this.currentStep < this.questions.length) {
            this.currentStep = this.questions.length;
            this.renderStep();
            return;
        }

        if (this.currentStep !== this.questions.length) return;

        // 今日の日付を取得 (YYYY-MM-DD)
        const today = new Date();
        const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // 提示いただいたPythonロジックに基づくプロンプト組み立て
        let promptText = `以下のヒアリング結果を元に、提供されている「要件定義書・仕様書」のテンプレートをすべて埋めて、初期ドラフトを作成してください。\n【ヒアリング結果(ユーザー要望)】\n`;
        promptText += `- **作成日(ヒアリング日) **: ${currentDate}\n\n`;

        const interviewPayload = {
            '定義書作成者': this.answers.creator?.trim() || '特になし(AI側で定義してください)',
            'プロジェクト目的': this.answers.purpose?.trim() || '特になし(AI側で定義してください)',
            '背景と現状課題': this.answers.background?.trim() || '特になし(AI側で定義してください)',
            '解決すべき根本問題': this.answers.core_problem?.trim() || '特になし(AI側で定義してください)',
            'KPI': this.answers.kpi?.trim() || '特になし(AI側で定義してください)',
            'KGI': this.answers.kgi?.trim() || '特になし(AI側で定義してください)',
            'ターゲットユーザー': this.answers.target_user?.trim() || '特になし(AI側で定義してください)',
            'コア機能': this.answers.core_features?.trim() || '特になし(AI側で定義してください)',
            '追加機能と優先度': this.answers.additional_features?.trim() || '特になし(AI側で定義してください)',
            '非対象範囲': this.answers.out_of_scope?.trim() || '特になし(AI側で定義してください)',
            '制約条件': this.answers.constraints?.trim() || '特になし(AI側で定義してください)',
            '性能要件': this.answers.performance?.trim() || '特になし(AI側で定義してください)',
            '主要データ': this.answers.main_data?.trim() || '特になし(AI側で定義してください)',
            '認証と権限': this.answers.auth_roles?.trim() || '特になし(AI側で定義してください)',
            '外部連携': this.answers.integration?.trim() || '特になし(AI側で定義してください)'
        };

        this.questions.forEach(q => {
            // 空欄の場合はデフォルト文字列をセット
            const ans = this.answers[q.id] ? this.answers[q.id].trim() : "特になし(AI側で定義してください)";
            promptText += `### ${q.label}\n${ans}\n\n`;
        });

        promptText += `- ヒアリングで「特になし」とされた項目や、言及がなかった詳細項目（API仕様、データ要件、テスト要件など）は、システムの目的に合わせてあなた（AI）が専門的な視点から推測し、最適な内容で仮埋めしてください。\n`;
        promptText += `- テンプレートの構造や項目は絶対に削除しないでください。\n`;

        this.close();
        
        // メイン処理へ完成したプロンプトを渡す
        if (typeof this.onSubmit === 'function') {
            this.onSubmit({
                promptText,
                interviewPayload
            });
        }
    }
}