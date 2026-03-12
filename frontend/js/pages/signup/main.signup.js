import * as service from '../../services/loginService.js';
import { showToast } from '../../common/toast.js';

const dom = {
    form: document.getElementById('signupForm'),
    submitBtn: document.getElementById('signupBtn'),
    userName: document.getElementById('user_name'),
    email: document.getElementById('email'),
    employeeNo: document.getElementById('employee_no'),
    departmentId: document.getElementById('department_id')
};

function setSubmitButtonState(isLoading) {
    if (!dom.submitBtn) return;

    if (isLoading) {
        if (!dom.submitBtn.dataset.originalText) {
            dom.submitBtn.dataset.originalText = dom.submitBtn.textContent;
        }
        dom.submitBtn.disabled = true;
        dom.submitBtn.textContent = '登録中...';
        dom.submitBtn.classList.add('is-loading');
        return;
    }

    dom.submitBtn.disabled = false;
    dom.submitBtn.textContent = dom.submitBtn.dataset.originalText || '新規登録';
    dom.submitBtn.classList.remove('is-loading');
}

function applyPrefillFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const employeeNo = params.get('employee_no');

    if (email && dom.email) {
        dom.email.value = email;
    }

    if (employeeNo && dom.employeeNo) {
        dom.employeeNo.value = employeeNo;
    }
}

async function handleSubmit(event) {
    event.preventDefault();
    if (!dom.form) return;

    setSubmitButtonState(true);

    try {
        const formData = new FormData(dom.form);
        const payload = Object.fromEntries(formData.entries());

        const result = await service.portfolioRegistration(payload);
        if (!result.success) {
            showToast(result.message || '登録に失敗しました');
            return;
        }

        showToast('登録が完了しました。ログインしてください。');

        const loginParams = new URLSearchParams({
            email: payload.email,
            employee_no: payload.employee_no
        });
        window.location.href = `/login?${loginParams.toString()}`;
    } catch (error) {
        console.error('Portfolio registration error:', error);
        showToast('通信エラーが発生しました');
    } finally {
        setSubmitButtonState(false);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    applyPrefillFromQuery();
    if (dom.form) {
        dom.form.addEventListener('submit', handleSubmit);
    }
});
