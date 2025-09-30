let allQuestions = [];
let shownQuestions = [];
let remainingQuestions = [];

// 解析Word文档内容为题目结构
function parseQuestionsFromHTML(html) {
    // 简单正则示例，实际可根据题库格式调整
    // 假设题目格式：1. 题干\nA. 选项A\nB. 选项B...\n答案: A
    const questionBlocks = html.split(/(?=\d+\.)/g);
    const questions = [];
    questionBlocks.forEach(block => {
        const lines = block.trim().split(/\n|<br\s*\/?>(?!\d+\.)/g);
        if (lines.length < 2) return;
        const qMatch = lines[0].match(/^(\d+)\.\s*(.*)$/);
        if (!qMatch) return;
        const number = qMatch[1];
        const stem = qMatch[2];
        const options = [];
        let answer = '';
        let type = 'single';
        for (let i = 1; i < lines.length; i++) {
            const optMatch = lines[i].match(/^([A-D])\.\s*(.*)$/);
            if (optMatch) {
                options.push({ key: optMatch[1], text: optMatch[2] });
            } else if (/^答案[:：]\s*(.*)$/i.test(lines[i])) {
                answer = lines[i].replace(/^答案[:：]\s*/i, '').trim();
                if (answer.length > 1) type = 'multi';
            } else if (/^正确|错误|对|错$/.test(lines[i])) {
                type = 'judge';
                options.push({ key: 'A', text: '正确' });
                options.push({ key: 'B', text: '错误' });
                answer = lines[i].includes('正') ? 'A' : 'B';
            }
        }
        if (options.length > 0 && answer) {
            questions.push({ number, stem, options, answer, type });
        }
    });
    return questions;
}

$(function() {
    $('#uploadBtn').click(function() {
        const file = $('#wordFile')[0].files[0];
        if (!file) {
            $('#uploadStatus').text('请先选择Word文件');
            return;
        }
        $('#uploadStatus').text('正在解析...');
        const reader = new FileReader();
        reader.onload = function(e) {
            mammoth.convertToHtml({ arrayBuffer: e.target.result })
                .then(function(result) {
                    const html = result.value.replace(/<p>/g, '').replace(/<\/p>/g, '\n');
                    allQuestions = parseQuestionsFromHTML(html);
                    shownQuestions = [];
                    remainingQuestions = [...allQuestions];
                    if (allQuestions.length === 0) {
                        $('#uploadStatus').text('未识别到题目，请检查Word格式');
                        $('#randomBtn').prop('disabled', true);
                    } else {
                        $('#uploadStatus').text('题库加载成功，共' + allQuestions.length + '题');
                        $('#randomBtn').prop('disabled', false);
                        updateRemaining();
                        $('#questionArea').empty();
                        $('#resultArea').empty();
                    }
                })
                .catch(function(err) {
                    $('#uploadStatus').text('解析失败: ' + err.message);
                });
        };
        reader.readAsArrayBuffer(file);
    });

    $('#randomBtn').click(function() {
        if (remainingQuestions.length === 0) {
            $('#questionArea').html('<div>题库已全部展示</div>');
            $('#randomBtn').prop('disabled', true);
            return;
        }
        let count = Math.min(10, remainingQuestions.length);
        let selected = [];
        for (let i = 0; i < count; i++) {
            const idx = Math.floor(Math.random() * remainingQuestions.length);
            selected.push(remainingQuestions[idx]);
            shownQuestions.push(remainingQuestions[idx]);
            remainingQuestions.splice(idx, 1);
        }
        renderQuestions(selected);
        updateRemaining();
        $('#resultArea').empty();
    });

    $('#questionArea').on('submit', 'form', function(e) {
        e.preventDefault();
        let correct = 0;
        let total = $(this).find('.question-block').length;
        $(this).find('.question-block').each(function() {
            const qIdx = $(this).data('qidx');
            const q = allQuestions[qIdx];
            let userAns = [];
            if (q.type === 'multi') {
                $(this).find('input[type=checkbox]:checked').each(function() {
                    userAns.push($(this).val());
                });
                userAns = userAns.sort().join('');
            } else {
                userAns = $(this).find('input[type=radio]:checked').val() || '';
            }
            if (userAns === q.answer) correct++;
        });
        $('#resultArea').text('本次得分：' + correct + ' / ' + total);
    });
});

function renderQuestions(questions) {
    let html = '<form>'; 
    questions.forEach(q => {
        const qIdx = allQuestions.findIndex(qq => qq.number === q.number);
        html += `<div class="question-block" data-qidx="${qIdx}">
            <div><b>${q.number}.</b> ${q.stem}</div>
            <div class="options">`;
        if (q.type === 'multi') {
            q.options.forEach(opt => {
                html += `<label><input type="checkbox" name="q${q.number}" value="${opt.key}"> ${opt.key}. ${opt.text}</label>`;
            });
        } else {
            q.options.forEach(opt => {
                html += `<label><input type="radio" name="q${q.number}" value="${opt.key}"> ${opt.key}. ${opt.text}</label>`;
            });
        }
        html += '</div></div>';
    });
    html += '<button type="submit">提交答案</button></form>';
    $('#questionArea').html(html);
}

function updateRemaining() {
    $('#remaining').text('剩余题目：' + remainingQuestions.length);
}
