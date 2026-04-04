(function () {
    const canvas = document.createElement('canvas');
    canvas.id = 'universe-canvas';
    const ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);

    // --- 核心样式：全屏、置底、不可点击 ---
    Object.assign(canvas.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: -1, 
        pointerEvents: 'none',
        width: '100vw',
        height: '100vh',
        display: 'block'
    });

    let w, h, stars = [], comets = [];

    // 自适应窗口
    const resize = () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // --- 星点初始化 (稀疏、温馨) ---
    for (let i = 0; i < 120; i++) {
        stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 1.3,
            alpha: Math.random(),
            change: Math.random() * 0.02 // 闪烁速度
        });
    }

    // --- 彗星(流星)初始化逻辑 ---
    const createComet = () => {
        // 运动方向偏角（弧度），例如：从左上往右下飘，角度在 30度 到 60度之间
        const angle = (Math.random() * 30 + 30) * Math.PI / 180;
        const speed = Math.random() * 4 + 2; // 中等偏慢速度，更像彗星

        return {
            x: Math.random() * w * 0.8, // 初始X
            y: Math.random() * h * 0.3, // 初始Y（偏上）
            vx: Math.cos(angle) * speed, // X轴速度分量
            vy: Math.sin(angle) * speed, // Y轴速度分量
            len: Math.random() * 180 + 120, // 彗尾长度
            r: Math.random() * 1 + 1, // 彗头半径
            alpha: 1, // 初始透明度
            color: `rgba(220, 240, 255,` // 淡淡的蓝白色
        };
    };

    // --- 核心绘制循环 ---
    const draw = () => {
        // 1. 关键：清除上一帧，但不使用纯色填充，保持透明度
        ctx.clearRect(0, 0, w, h);

        // 2. 关键：在底下一层绘制“压暗遮罩”，将你原有的背景图调暗 40%
        // 如果想更暗，把 0.4 改大；想更亮，改小。
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; 
        ctx.fillRect(0, 0, w, h);

        // 3. 绘制背景星点（闪烁效果）
        stars.forEach(s => {
            s.alpha += s.change;
            if (s.alpha > 1 || s.alpha < 0) s.change *= -1;
            ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // 4. 偶尔生成稀少的彗星
        if (Math.random() < 0.003 && comets.length < 2) { // 极低概率生成，同屏最多2颗
            comets.push(createComet());
        }

        // 5. 绘制彗星（修正彗尾方向）
        comets.forEach((c, i) => {
            // 当前彗头位置
            const headX = c.x;
            const headY = c.y;

            // 关键修正：计算彗尾的终点，使其精准指向运动方向的反方向
            // 当前位置 - 速度向量 * 长度系数
            const tailX = headX - (c.vx / Math.sqrt(c.vx**2 + c.vy**2)) * c.len;
            const tailY = headY - (c.vy / Math.sqrt(c.vx**2 + c.vy**2)) * c.len;

            // 创建从彗头到彗尾的渐变
            let grad = ctx.createLinearGradient(headX, headY, tailX, tailY);
            grad.addColorStop(0, `${c.color} ${c.alpha})`); // 头：亮
            grad.addColorStop(0.2, `${c.color} ${c.alpha * 0.6})`); // 过渡
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)'); // 尾：透明

            ctx.strokeStyle = grad;
            ctx.lineWidth = c.r * 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(headX, headY);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();

            // 移动彗星
            c.x += c.vx;
            c.y += c.vy;
            c.alpha -= 0.005; // 缓慢淡出

            // 移除划出屏幕或淡出的彗星
            if (c.y > h + c.len || c.alpha <= 0) {
                comets.splice(i, 1);
            }
        });

        requestAnimationFrame(draw);
    };

    // --- 适配 PJAX ---
    document.addEventListener('pjax:complete', () => {
        if (!document.body.contains(canvas)) {
            document.body.appendChild(canvas);
            resize(); // 重新适配
        }
    });

    draw();
})();