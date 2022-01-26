import Client from './Client';

jest.mock('./Client', () => {
    return jest
        .fn()
        .mockImplementationOnce(() => jest.fn())
        .mockImplementationOnce(() => {
            return { devMode: false };
        })
        .mockImplementationOnce(() => {
            return { devMode: true };
        });
});

it('Instantiates the client', () => {
    new Client();
    expect(Client).toHaveBeenCalledTimes(1);
});

it('Checks if the client is in devMode', () => {
    const clientA = new Client();
    const clientB = new Client();

    expect(clientA.devMode).toBe(false);
    expect(clientB.devMode).toBe(true);
});
