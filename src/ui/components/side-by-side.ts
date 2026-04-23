export type SideBySideModel = {
  referenceObjectUrl: string;
  liveObjectUrl: string;
  similarityLine: string;
};

export function renderSideBySide(model: SideBySideModel): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = 'access-side-by-side';

  const grid = document.createElement('div');
  grid.className = 'access-side-by-side__grid';

  const left = document.createElement('figure');
  left.className = 'access-side-by-side__cell';
  const imgRef = document.createElement('img');
  imgRef.className = 'access-side-by-side__img';
  imgRef.alt = 'Enrolled reference';
  imgRef.src = model.referenceObjectUrl;
  left.appendChild(imgRef);

  const right = document.createElement('figure');
  right.className = 'access-side-by-side__cell';
  const imgLive = document.createElement('img');
  imgLive.className = 'access-side-by-side__img';
  imgLive.alt = 'Live capture';
  imgLive.src = model.liveObjectUrl;
  right.appendChild(imgLive);

  grid.appendChild(left);
  grid.appendChild(right);

  const score = document.createElement('p');
  score.className = 'access-side-by-side__score';
  score.textContent = model.similarityLine;

  wrap.appendChild(grid);
  wrap.appendChild(score);
  return wrap;
}
