import { useCallback, useState } from 'react';
import { isPending, SyncPromise, usePromiseState } from 'react-sync-promise';

/**
 * Aux variable to properly detect values initial state
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
const initial = new Promise<never>(() => {});

/**
 * Turn an asynchronous callback into a memoized synchronous callback
 *
 * @example const [result, callback] = useAsyncCallback(() => Promise.resolve('Hello there'))
 * @returns
 *  tupple with synchronous promise of the callback or a null value (if there has not been a call)
 *  and the memoized synchronous callback
 * @see {SyncPromise}
 */
export const useAsyncCallback = <Result, Error = unknown, Params extends unknown[] = never[]>(
    asyncCallback: (...args: Params) => Promise<Result>,
    dep: ReadonlyArray<unknown> = [],
): [result: SyncPromise<Result, Error> | null, execute: (...args: Params) => void] => {
    /**
     * Due to the state of the sync promise not changing (as it was pending before)
     * a manual initial re-render trigger needs to be made
     */
    const [isInitial, setInitial] = useState(true);
    /** The async promise turned synchronous */
    const [syncPromise, setAsyncPromise] = usePromiseState<Result, Error>(initial);
    /** The semaphor property to make sure the callback will not be executed before it is done */
    const isLoading = !isInitial && isPending(syncPromise);

    const callback = useCallback(
        (...args: Params) => {
            if (isLoading) {
                /** Is still running */
                return;
            }

            setInitial(false);
            setAsyncPromise(asyncCallback(...args));
        },
        [...dep, isLoading],
    );

    return [isInitial ? null : syncPromise, callback];
};
