(function() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);

    // 基础样式：全屏、置底、不可点击
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '-1'; 
    canvas.style.pointerEvents = 'none';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';

    let width, height, drops = [];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    // 初始化雨滴
    for (let i = 0; i < 15; i++) {
        drops.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vel: Math.random() * 2 + 5, // 下落速度
            len: Math.random() * 20 + 10  // 雨滴长度
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)'; // 雨的颜色
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';

        drops.forEach(d => {
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x, d.y + d.len); // 画一条垂直线
            ctx.stroke();

            d.y += d.vel;
            if (d.y > height) {
                d.y = -d.len;
                d.x = Math.random() * width;
            }
        });
        requestAnimationFrame(draw);
    }

    // 适配 PJAX：如果页面切换，确保动画持续
    document.addEventListener('pjax:complete', () => {
        if (!document.body.contains(canvas)) {
            document.body.appendChild(canvas);
        }
    });

    draw();
})();