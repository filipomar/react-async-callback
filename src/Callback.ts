import { useCallback, useState } from 'react';
import { isPending, SyncPromise, usePromise } from 'react-sync-promise';

/**
 * Aux variable to properly detect values initial state
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
const initial = new Promise<never>(() => {});

/**
 * Turn an asynchronous callback into a memoized synchronous callback
 *
 * @example const [result, callback] = useAsyncCallback(() => Promise.resolve('Hello there'))
 * @returns tupple with synchronous promise of the callback or a null value (if there has not been a call) and the memoized synchronous callback
 * @see {SyncPromise}
 */
export const useAsyncCallback = <P extends unknown[], T, E = unknown>(
    asyncCallback: (...args: P) => Promise<T>,
    dep: ReadonlyArray<unknown> = [],
): [result: SyncPromise<T, E> | null, execute: (...args: P) => void] => {
    /** Async promise with the actual promise result */
    const [asyncPromise, setAsyncPromise] = useState<Promise<T>>(initial);
    /** The async promise turned synchronous */
    const syncPromise = usePromise<T, E>(asyncPromise);
    /** The semaphor property to make sure the callback will not be executed before it is done */
    const isLoading = asyncPromise !== initial && isPending(syncPromise);

    const callback = useCallback(
        (...args: P) => {
            if (isLoading) {
                /** Is still running */
                return;
            }
            setAsyncPromise(asyncCallback(...args));
        },
        [...dep, isLoading],
    );

    return [initial === asyncPromise ? null : syncPromise, callback];
};
