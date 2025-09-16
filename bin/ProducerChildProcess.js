
const result = [];

process.on('message', (args) => {
    const {identifier, action, timeout, times, random, terminate} = args;

    const tick = (count) => {
        let log = [Date.now(), "PRODUCER", identifier, action]
        if (timeout)
            log.push(timeout);
        if (times && count)
            log.push(`${count}/${times}`, random || false);

        log = log.join(' - ');
        result.push(log);

        const res = {identifier: identifier, action: action, timeout: timeout, times: times, random: random}
        if (result.length === times)
            res.result = result;
        process.send(res);
    }

    if (terminate){
        let log = [Date.now(), "PRODUCER", identifier, action, `Quitting!`]
        console.log(log.join(' - '))
        process.exit(0);
    }

    if (!timeout)
        return tick(times);

    const getTimeout = () => {
        if (!random)
            return timeout;
        return Math.floor(Math.random() * timeout)
    }

    let actionCount = 0;

    const iterator = () => {
        const t = getTimeout();
        setTimeout(() => {
            actionCount ++;
            tick(actionCount);
            if (actionCount < times)
                iterator();
        }, t)
    }

    iterator();
});