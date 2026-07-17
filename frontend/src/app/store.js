import { configureStore } from '@reduxjs/toolkit';
import worktraceReducer from '../features/worktrace/worktraceSlice';

export const store = configureStore({
  reducer: {
    worktrace: worktraceReducer
  }
});
