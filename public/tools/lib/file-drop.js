/* 文件拖拽区：M1 两个工具共用，不把同一套 DOM 和监听复制到每个模块。 */

export function dropZoneHtml({ id, accept, title = '拖入文件，或点击选择', sub = '', meta = 'LOCAL ONLY · 不上传服务器' }) {
  return `
    <input class="conv-file-input" id="${id}File" type="file" accept="${accept}" />
    <label class="conv-drop" id="${id}Drop" for="${id}File" tabindex="0" style="display:flex;flex-direction:column;align-items:center;justify-content:center;border-width:.5px;margin:0;min-height:180px">
      <span class="conv-drop-icon" aria-hidden="true">⇣</span>
      <span class="conv-drop-title">${title}</span>
      ${sub ? `<span class="conv-drop-sub">${sub}</span>` : ''}
      <span class="conv-drop-meta"><i></i>${meta}</span>
    </label>`;
}

export function wireDrop(root, { id, maxBytes, multiple = false, onFiles, onError }) {
  const drop = root.querySelector(`#${id}Drop`);
  const input = root.querySelector(`#${id}File`);
  if (!drop || !input) throw new Error('拖拽区初始化失败');

  const acceptFiles = (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const selected = multiple ? list : list.slice(0, 1);
    const over = selected.find((file) => file.size > maxBytes);
    if (over) {
      onError?.(`${over.name} 超过 ${Math.round(maxBytes / 1024 / 1024)}MB 上限`);
      return;
    }
    onFiles(selected);
  };

  drop.addEventListener('dragover', (event) => {
    event.preventDefault();
    drop.classList.add('is-drag');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-drag'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('is-drag');
    acceptFiles(event.dataTransfer?.files);
  });
  drop.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', () => {
    acceptFiles(input.files);
    input.value = '';
  });

  return { drop, input };
}
