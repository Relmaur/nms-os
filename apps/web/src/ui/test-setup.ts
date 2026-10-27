// Unmount rendered components between tests (Testing Library only does this itself when test globals are on).
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);
