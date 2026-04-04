document.addEventListener('click', function (e) {
  const target = e.target.closest('a');
  // 判断点击的是否是内部锚点链接
  if (target && target.getAttribute('href').startsWith('#')) {
    const id = target.getAttribute('href').slice(1);
    const element = document.getElementById(id);
    
    if (element) {
      e.preventDefault();
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      history.pushState(null, null, '#' + id);
    }
  }
}, false);