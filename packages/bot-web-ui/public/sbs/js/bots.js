document.querySelectorAll('.bot-card').forEach(card => {
    card.addEventListener('click', () => {
        const title = card.querySelector('.bot-title').textContent;
        const botFilename = card.dataset.filename || '/botz/HL HAMMER B-BOT 1.0.XML'; // example filename

        window.parent.postMessage({ type: 'botSelect', filename: botFilename }, '*');
    });
});
