import type { AdminUiStrings } from './gate-ui-runtime';
import type { User } from '../domain/types';

export type AdminUserRosterHandlers = {
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
};

function appendRosterRow(
  tbody: HTMLTableSectionElement,
  u: User,
  copy: AdminUiStrings,
  handlers: AdminUserRosterHandlers,
  urls: string[],
): void {
  const tr = document.createElement('tr');
  tr.dataset.userId = u.id;

  const tdPhoto = document.createElement('td');
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
  tdPhoto.appendChild(img);

  const tdName = document.createElement('td');
  tdName.textContent = u.name;

  const tdRole = document.createElement('td');
  tdRole.textContent = u.role;

  const tdCreated = document.createElement('td');
  try {
    tdCreated.textContent = new Date(u.createdAt).toLocaleString();
  } catch {
    tdCreated.textContent = String(u.createdAt);
  }

  const tdActions = document.createElement('td');
  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'admin-user-roster__actions';
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

  actionsWrap.append(editBtn, delBtn);
  tdActions.appendChild(actionsWrap);
  tr.append(tdPhoto, tdName, tdRole, tdCreated, tdActions);
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
