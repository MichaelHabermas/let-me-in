import type { AccessLogRow, User } from '../domain/types';
import { filterAndSortLogRows, type LogFilterState, type LogSortKey } from './log-page-table';
import { renderLogRows, type LogToolbarControls } from './log-page-dom';

type LogPageState = {
  filters: LogFilterState;
  sortKey: LogSortKey;
  sortAsc: boolean;
};

function createInitialLogPageState(): LogPageState {
  return {
    filters: { dateFrom: '', dateTo: '', userId: '', decision: '' },
    sortKey: 'timestamp',
    sortAsc: false,
  };
}

function applyToolbarFilters(state: LogPageState, controls: LogToolbarControls): void {
  state.filters.dateFrom = controls.dateFrom.value;
  state.filters.dateTo = controls.dateTo.value;
  state.filters.userId = controls.userSelect.value;
  state.filters.decision = controls.decisionSelect.value as LogFilterState['decision'];
}

export function createLogPageController(params: {
  rows: AccessLogRow[];
  users: User[];
  unknown: string;
  tbody: HTMLTableSectionElement;
  controls: LogToolbarControls;
  userNames: Map<string, string>;
}) {
  const { rows, users, unknown, tbody, controls, userNames } = params;
  const state = createInitialLogPageState();

  const render = () => {
    applyToolbarFilters(state, controls);
    const sortedRows = filterAndSortLogRows(
      rows,
      users,
      state.filters,
      state.sortKey,
      state.sortAsc,
      unknown,
    );
    renderLogRows(tbody, sortedRows, userNames, unknown);
  };

  const onSortHeaderClick = (key: LogSortKey) => {
    if (state.sortKey === key) {
      state.sortAsc = !state.sortAsc;
    } else {
      state.sortKey = key;
      state.sortAsc = key !== 'timestamp';
    }
    render();
  };

  return {
    render,
    onSortHeaderClick,
  };
}
