import React, { FC } from 'react';
import { fireEvent, render, act, findByTestId } from '@testing-library/react';
import { SyncPromise, SyncPromiseState } from 'react-sync-promise';

import { useAsyncCallback } from '.';

type PromisesArray = (SyncPromise<string, unknown> | null)[];

const delay = async (milliseconds: number): Promise<void> => new Promise((resolve) => {
    setTimeout(() => resolve(), milliseconds);
});

const Helper: FC<Readonly<{ onRender: (syncPromises: PromisesArray) => void }>> = ({ onRender }) => {
    /** Resolves right away */
    const [firstPromise, firstCallback] = useAsyncCallback(() => Promise.resolve('HELLO THERE'));

    /** Rejects right away */
    const [secondPromise, secondCallback] = useAsyncCallback(() => delay(50).then(() => {
        throw new Error('General kenobi');
    }));

    /** Takes some time to resolve */
    const [thirdPromise, thirdCallback] = useAsyncCallback(() => delay(200).then<string>(() => "You're a bold one"));

    onRender([firstPromise, secondPromise, thirdPromise]);

    return (
        <>
            <button type="button" aria-label="testing-button" data-testid="first-button" onClick={firstCallback} />
            <button type="button" aria-label="testing-button" data-testid="second-button" onClick={secondCallback} />
            <button type="button" aria-label="testing-button" data-testid="third-button" onClick={thirdCallback} />
        </>
    );
};

describe(useAsyncCallback, () => {
    it('turns asynchronous callback into synchronous callback', () => act(async () => {
        const onRender = jest.fn<void, [PromisesArray]>();

        const { container } = render(<Helper onRender={onRender} />);

        const firstButton = await findByTestId(container, 'first-button');
        const secondButton = await findByTestId(container, 'second-button');
        const thirdButton = await findByTestId(container, 'third-button');

        /** Calls with initial values were made */
        expect(onRender).toBeCalledTimes(1);
        expect(onRender).nthCalledWith(1, [null, null, null]);

        fireEvent.click(firstButton);

        /** Now first is loading */
        expect(onRender).toBeCalledTimes(2);
        expect(onRender).nthCalledWith(2, [{ state: SyncPromiseState.PENDING }, null, null]);

        await delay(0);

        /** And first has loaded */
        expect(onRender).toBeCalledTimes(3);
        expect(onRender).nthCalledWith(3, [{ state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' }, null, null]);

        fireEvent.click(secondButton);

        /** Now second is loading */
        expect(onRender).toBeCalledTimes(4);
        expect(onRender).nthCalledWith(4, [{ state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' }, { state: SyncPromiseState.PENDING }, null]);

        await delay(50);

        /** And first has loaded with an error */
        expect(onRender).toBeCalledTimes(5);
        expect(onRender).nthCalledWith(5, [
            { state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' },
            { state: SyncPromiseState.REJECTED, value: new Error('General kenobi') },
            null,
        ]);

        fireEvent.click(thirdButton);

        /** Now third is loading */
        expect(onRender).toBeCalledTimes(6);
        expect(onRender).nthCalledWith(6, [
            { state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' },
            { state: SyncPromiseState.REJECTED, value: new Error('General kenobi') },
            { state: SyncPromiseState.PENDING },
        ]);

        await delay(100);

        /** Click again */
        fireEvent.click(thirdButton);

        /** No extra render was made as promise change was canceled */
        expect(onRender).toBeCalledTimes(6);

        await delay(100);

        /** Now third has loaded */
        expect(onRender).toBeCalledTimes(7);
        expect(onRender).nthCalledWith(7, [
            { state: SyncPromiseState.RESOLVED, value: 'HELLO THERE' },
            { state: SyncPromiseState.REJECTED, value: new Error('General kenobi') },
            { state: SyncPromiseState.RESOLVED, value: "You're a bold one" },
        ]);
    }));
});
