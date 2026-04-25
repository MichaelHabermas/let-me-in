import type { AccessLogRow, User } from '../domain/types';
import type { AccessLogReviewService } from './access-log-review-service';
import { filterAndSortLogRows, type LogFilterState, type LogSortKey } from './log-page-table';
import { renderLogRows, type LogToolbarControls } from './log-page-dom';

type LogPageState = {
  filters: LogFilterState;
  sortKey: LogSortKey;
  sortAsc: boolean;
};

function createInitialLogPageState(): LogPageState {
  return {
    filters: { dateFrom: '', dateTo: '', userId: '', decision: '', review: '' },
    sortKey: 'timestamp',
    sortAsc: false,
  };
}

function applyToolbarFilters(state: LogPageState, controls: LogToolbarControls): void {
  state.filters.dateFrom = controls.dateFrom.value;
  state.filters.dateTo = controls.dateTo.value;
  state.filters.userId = controls.userSelect.value;
  state.filters.decision = controls.decisionSelect.value as LogFilterState['decision'];
  state.filters.review = controls.reviewSelect.value as LogFilterState['review'];
}

export function createLogPageController(params: {
  rows: AccessLogRow[];
  users: User[];
  unknown: string;
  tbody: HTMLTableSectionElement;
  controls: LogToolbarControls;
  userNames: Map<string, string>;
  reviewService?: AccessLogReviewService;
}) {
  const { rows, users, unknown, tbody, controls, userNames, reviewService } = params;
  const state = createInitialLogPageState();

  const onReview = (timestamp: number, reviewedDecision: 'GRANTED' | 'DENIED') => {
    void (async () => {
      await reviewService?.setReviewedDecision({ timestamp, reviewedDecision });
      const row = rows.find((candidate) => candidate.timestamp === timestamp);
      if (row) {
        row.reviewedDecision = reviewedDecision;
        row.reviewedAt = Date.now();
      }
      render();
    })();
  };

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
    renderLogRows(tbody, sortedRows, userNames, unknown, reviewService ? onReview : undefined);
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
