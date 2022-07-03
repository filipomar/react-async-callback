import React, { FC, ReactNode } from 'react';
import { fireEvent, render, act, findByTestId } from '@testing-library/react';
import { SyncPromise, SyncPromiseState } from 'react-sync-promise';

import { useAsyncCallback } from '.';

type PromisesArray = (SyncPromise<string, unknown> | null)[];

const delay = async (milliseconds: number): Promise<void> => new Promise((resolve) => {
    setTimeout(() => resolve(), milliseconds);
});

const Helper: FC<Readonly<{ onRender: (syncPromises: PromisesArray) => void; config: { testid: string; callback: () => Promise<string> }[] }>> = ({ config, onRender }) => {
    const promises: PromisesArray = [];
    const buttons: ReactNode[] = [];

    config.forEach(({ testid, callback }) => {
        const [promise, syncCallback] = useAsyncCallback(callback);
        promises.push(promise);
        buttons.push(<button key={testid} type="button" aria-label="testing-button" data-testid={testid} onClick={syncCallback} />);
    });

    onRender(promises);

    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{buttons}</>;
};

describe(useAsyncCallback, () => {
    it('turns asynchronous callback into synchronous callback', () => act(async () => {
        const onRender = jest.fn<void, [PromisesArray]>();

        const { container, unmount } = render(
            <Helper
                onRender={onRender}
                config={[
                    { testid: 'first-button', callback: () => Promise.resolve('HELLO THERE') },
                    {
                        testid: 'second-button',
                        callback: () => delay(50).then(() => {
                            throw new Error('General kenobi');
                        }),
                    },
                    { testid: 'third-button', callback: () => delay(200).then<string>(() => "You're a bold one") },
                ]}
            />,
        );

        const firstButton = await findByTestId(container, 'first-button');
        const secondButton = await findByTestId(container, 'second-button');
        const thirdButton = await findByTestId(container, 'third-button');

        /** Calls with initial values were made */
        expect(onRender).toBeCalledTimes(1);
        expect(onRender).nthCalledWith(1, [null, null, null]);

        /** Click on the first one */
        fireEvent.click(firstButton);

        /** The first is loading */
        expect(onRender).toBeCalledTimes(2);
        expect(onRender).nthCalledWith(2, [{ state: SyncPromiseState.PENDING }, null, null]);

        await delay(0);

        /** Now response has rendered, and due to callback, another render is executed */
        expect(onRender).toBeCalledTimes(4);
        expect(onRender).nthCalledWith(3, [{ state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' }, null, null]);
        expect(onRender).nthCalledWith(4, [{ state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' }, null, null]);

        fireEvent.click(secondButton);

        /** Now second is loading */
        expect(onRender).toBeCalledTimes(5);
        expect(onRender).nthCalledWith(5, [{ state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' }, { state: SyncPromiseState.PENDING }, null]);

        await delay(50);

        /** And second has loaded with an error */
        expect(onRender).toBeCalledTimes(6);
        expect(onRender).nthCalledWith(6, [
            { state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' },
            { state: SyncPromiseState.REJECTED, value: new Error('General kenobi') },
            null,
        ]);

        fireEvent.click(thirdButton);

        await delay(1);

        /** Now third is loading */
        expect(onRender).toBeCalledTimes(7);
        expect(onRender).nthCalledWith(7, [
            { state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' },
            { state: SyncPromiseState.REJECTED, value: new Error('General kenobi') },
            { state: SyncPromiseState.PENDING },
        ]);

        await delay(100);

        /** Promise has yet to yield */
        expect(onRender).toBeCalledTimes(7);

        /** Click again */
        fireEvent.click(thirdButton);

        await delay(1);

        /** No further changes occured as second call was ignored */
        expect(onRender).toBeCalledTimes(7);

        await delay(100);

        /** Now third has loaded */
        expect(onRender).toBeCalledTimes(8);
        expect(onRender).nthCalledWith(8, [
            { state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' },
            { state: SyncPromiseState.REJECTED, value: new Error('General kenobi') },
            { state: SyncPromiseState.RESOLVED, value: "You're a bold one" },
        ]);

        unmount();
    }));

    it('properly handles sequential calls', () => act(async () => {
        const onRender = jest.fn<void, [PromisesArray]>();

        const { container, unmount } = render(<Helper onRender={onRender} config={[{ testid: 'first-button', callback: () => delay(10).then(() => 'HELLO THERE') }]} />);

        const firstButton = await findByTestId(container, 'first-button');

        /** Call with initial the value was made */
        expect(onRender).toBeCalledTimes(1);
        expect(onRender).nthCalledWith(1, [null]);

        /** Make 2 sequential calls */
        fireEvent.click(firstButton);
        await delay(20);

        fireEvent.click(firstButton);
        await delay(20);

        expect(onRender).toBeCalledTimes(6);
        // Loading
        expect(onRender).nthCalledWith(2, [{ state: SyncPromiseState.PENDING }]);
        // Loaded
        expect(onRender).nthCalledWith(3, [{ state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' }]);
        // Loading caused another re-render due to the callback
        expect(onRender).nthCalledWith(4, [{ state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' }]);
        // Set back to pending because of the second click
        expect(onRender).nthCalledWith(5, [{ state: SyncPromiseState.PENDING }]);
        // Loaded again
        expect(onRender).nthCalledWith(6, [{ state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' }]);

        unmount();
    }));
});
