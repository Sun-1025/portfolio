'use strict';

/**
 * 内容模型与私密过滤（前后端 / 导出共用，防止三处语义漂移）。
 *
 * 语义（以验收为准）：
 * - status:'draft'   → 公开接口 / 静态导出完全不出现（连标题都没有）。
 * - visible:false    → 数组内保留位置，只出现占位字段 {id,type,title,note:'暂未公开'}。
 * - deletedAt 存在   → 等同草稿（不出现）。
 */

const NOTE = '暂未公开';

/** type 白名单 → site.json 路径（禁止用请求参数拼任意路径） */
const TYPE_TARGETS = {
  site:     ['site'],
  nav:      ['nav'],
  branch:   ['branches'],
  hero:     ['home', 'hero'],
  about:    ['home', 'about'],
  timeline: ['home', 'timeline'],
  contact:  ['home', 'contacts'],
  campus:   ['home', 'campus'],
  case:     ['work', 'cases'],
  interest: ['interests'],
  tool:     ['tools', 'items'],
  notice:   ['notices'],
  ai:       ['ai'],
  settings: ['settings'],
};

/** 集合型（数组）类型 */
const COLLECTION_TYPES = ['nav', 'branch', 'timeline', 'contact', 'campus', 'case', 'interest', 'tool', 'notice'];
/** 单体型 */
const SINGLE_TYPES = ['site', 'hero', 'about', 'ai', 'settings'];

function getAt(root, target) {
  let cur = root;
  for (const key of target) {
    if (cur == null) return undefined;
    cur = cur[key];
  }
  return cur;
}

function isDeleted(item) { return !!(item && item.deletedAt); }
function isDraft(item) { return !!(item && item.status === 'draft'); }
function isPrivate(item) { return !!(item && item.visible === false); }

function placeholder(item, type) {
  const out = {
    id: String(item.id || ''),
    type,
    title: String(item.title || item.label || item.name || ''),
    note: NOTE,
  };
  // 保留归属合集与排序：私密条目仍挂在自己的父级下，前台不会把它当成顶层卡片。
  if (item.parent) out.parent = String(item.parent);
  if (Number.isFinite(item.order)) out.order = item.order;
  return out;
}

function stripPrivateFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === 'object' && v !== null ? stripPrivateFields(v) : v;
  }
  return out;
}

/** 私密/草稿条目引用的本地图片路径集合（导出时跳过这些文件） */
function privateImageRefs(content) {
  const refs = new Set();
  const pick = (item) => {
    if (!item || typeof item !== 'object') return;
    for (const key of ['cover', 'image', 'img', 'src', 'icon']) {
      const v = item[key];
      if (typeof v === 'string' && (v.startsWith('/assets/') || v.startsWith('/uploads/'))) refs.add(v.replace(/^\/+/, ''));
    }
    for (const key of ['images', 'photos', 'gallery']) {
      const list = item[key];
      if (Array.isArray(list)) {
        for (const im of list) {
          if (typeof im === 'string' && im.startsWith('/')) refs.add(im.replace(/^\/+/, ''));
          else if (im && typeof im === 'object') pick(im);
        }
      }
    }
  };
  for (const t of COLLECTION_TYPES) {
    const list = getAt(content, TYPE_TARGETS[t]);
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (isDraft(item) || isDeleted(item) || isPrivate(item)) pick(item);
    }
  }
  return refs;
}

/**
 * 公开视图：深拷贝后替换 / 剔除不可见条目。
 * @param {object} content 原始 site.json
 * @param {object|null} preview  { type, id } 时该条目保留全量（预览 iframe 用）
 */
function filterPublic(content, preview = null) {
  const clone = stripPrivateFields(content);
  for (const t of COLLECTION_TYPES) {
    const list = getAt(clone, TYPE_TARGETS[t]);
    if (!Array.isArray(list)) continue;
    const next = [];
    for (const item of list) {
      if (preview && t === preview.type && String(item.id) === String(preview.id)) {
        next.push(stripPrivateFields(getAt(content, TYPE_TARGETS[t]).find((x) => String(x.id) === String(preview.id)) || item));
        continue;
      }
      if (isDraft(item) || isDeleted(item)) continue;            // 草稿 / 回收站：完全不出现
      if (isPrivate(item)) { next.push(placeholder(item, t)); continue; }
      next.push(item);
    }
    // 写回克隆
    const parent = getAt(clone, TYPE_TARGETS[t].slice(0, -1));
    parent[TYPE_TARGETS[t][TYPE_TARGETS[t].length - 1]] = next;
  }
  // 联系方式里的可见开关
  const contacts = getAt(clone, ['home', 'contacts']);
  if (Array.isArray(contacts)) {
    getAt(clone, ['home']).contacts = contacts.map((c) => {
      if (preview && preview.type === 'contact' && String(c.id) === String(preview.id)) return c;
      if (c.visible === false || c.status === 'draft' || c.deletedAt) {
        return { id: c.id, type: 'contact', title: c.label, note: NOTE };
      }
      return c;
    });
  }
  // selectedIds：引用私密项时保留（前台渲染占位卡）
  return clone;
}

/** 生成信封字段（迁移与新建共用） */
function envelope(item, index = 0, extra = {}) {
  return {
    id: String(item.id || extra.id || ''),
    title: String(item.title || ''),
    status: item.status || 'published',
    visible: item.visible !== false,
    order: Number.isInteger(item.order) ? item.order : index,
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

module.exports = {
  NOTE,
  TYPE_TARGETS,
  COLLECTION_TYPES,
  SINGLE_TYPES,
  getAt,
  isDeleted,
  isDraft,
  isPrivate,
  placeholder,
  filterPublic,
  privateImageRefs,
  envelope,
};
