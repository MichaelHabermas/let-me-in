import type { AdminUiStrings } from './gate-ui-runtime';
import type { User } from '../domain/types';

export type AdminUserRosterHandlers = {
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
};

function buildPhotoCell(u: User, copy: AdminUiStrings, urls: string[]): HTMLTableCellElement {
  const td = document.createElement('td');
  const img = document.createElement('img');
  img.className = 'admin-user-roster__thumb';
  img.alt = copy.rosterThumbnailAlt;
  const refBlob =
    typeof Blob !== 'undefined' && u.referenceImageBlob instanceof Blob
      ? u.referenceImageBlob
      : new Blob([], { type: 'image/jpeg' });
  const url = URL.createObjectURL(refBlob);
  urls.push(url);
  img.src = url;
  td.appendChild(img);
  return td;
}

function buildCreatedCell(u: User): HTMLTableCellElement {
  const td = document.createElement('td');
  try {
    td.textContent = new Date(u.createdAt).toLocaleString();
  } catch {
    td.textContent = String(u.createdAt);
  }
  return td;
}

function buildActionsCell(
  u: User,
  copy: AdminUiStrings,
  handlers: AdminUserRosterHandlers,
): HTMLTableCellElement {
  const td = document.createElement('td');
  const wrap = document.createElement('div');
  wrap.className = 'admin-user-roster__actions';
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn btn--small';
  editBtn.textContent = copy.rosterEdit;
  editBtn.setAttribute('data-testid', 'admin-user-edit');
  editBtn.addEventListener('click', () => handlers.onEdit(u));

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'btn btn--small btn--danger';
  delBtn.textContent = copy.rosterDelete;
  delBtn.setAttribute('data-testid', 'admin-user-delete');
  delBtn.addEventListener('click', () => handlers.onDelete(u));

  wrap.append(editBtn, delBtn);
  td.appendChild(wrap);
  return td;
}

function buildTextCell(text: string): HTMLTableCellElement {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function appendRosterRow(
  tbody: HTMLTableSectionElement,
  u: User,
  copy: AdminUiStrings,
  handlers: AdminUserRosterHandlers,
  urls: string[],
): void {
  const tr = document.createElement('tr');
  tr.dataset.userId = u.id;
  tr.append(
    buildPhotoCell(u, copy, urls),
    buildTextCell(u.name),
    buildTextCell(u.role),
    buildCreatedCell(u),
    buildActionsCell(u, copy, handlers),
  );
  tbody.appendChild(tr);
}

/** Renders rows into `tbody`; returns revoke for object URLs created for thumbnails. */
export function renderAdminUserRoster(
  tbody: HTMLTableSectionElement,
  users: User[],
  copy: AdminUiStrings,
  handlers: AdminUserRosterHandlers,
): () => void {
  const urls: string[] = [];
  const revoke = () => {
    for (const u of urls) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        /* ignore */
      }
    }
    urls.length = 0;
  };

  tbody.replaceChildren();
  const sorted = [...users].sort((a, b) => a.createdAt - b.createdAt);
  for (const u of sorted) {
    appendRosterRow(tbody, u, copy, handlers, urls);
  }

  return revoke;
}
