# react-async-callback

A small react helper snippet to handle async callbacks and turn their output into values hooked to the react life-cycle

:warning: Relies on `react-sync-promise` internally.

## Installation

`npm install react-async-callback` and there you go, nothing more needed

## Usage

```tsx
import React, { FC } from 'react';
import { isPending, isRejected, isResolved, ifUnresolved } from 'react-sync-promise';
import { useAsyncCallback } from 'react-async-callback';

export const PrequelsSurprise: FC = () => {
    const [result, onClick] = useAsyncCallback(() => Promise.resolve('Execute order 66'));

    return (
        <>
            <button type="button" aria-label="demo-button" onClick={onClick} />
            <p>{`Has not been called: ${result === null}`}</p>
            <p>{`Is loading: ${result !== null && isPending(result)}`}</p>
            <p>{`Was rejected: ${result !== null && isRejected(result)}`}</p>
            <p>{`Was finished: ${result !== null && isResolved(result)}`}</p>
            <p>{`Value or unresolved: ${result !== null && ifUnresolved(result, 'Pod racing')}`}</p>
        </>
    );
};
```

## License

APACHE
