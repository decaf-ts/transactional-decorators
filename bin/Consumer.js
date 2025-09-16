
const {fork} = require('child_process');

/**
 * Util method to compare Consumer/Producer logs by sorting them according to their timestamp and verifying the order of operations is the same
 * @param {string[]} consumerData
 * @param {string[]} producerData
 * @param {() => void} callback
 * @return {*}
 */
const defaultComparer = function(consumerData, producerData, callback){
    const parseData = function(data){
        data = data.split(' - ');
        return {
            timestamp: parseInt(data[0]),
            child: data[2],
            action: data[3]
        }
    }
    const sortedConsumerData = Object.keys(consumerData).reduce((accum, key) => {
            accum.push(...(consumerData[key].map(data => parseData(data))))
            return accum;
        }, []).sort((a,b) => a.timestamp - b.timestamp);


    const sortedProducerData = Object.keys(producerData).reduce((accum, key) => {
            accum.push(...(producerData[key].map(data => parseData(data))))
            return accum;
        }, []).sort((a,b) => a.timestamp - b.timestamp);

    if (sortedProducerData.length !== sortedConsumerData.length)
        return callback(`Producer data and consumer data does not match in length`, sortedConsumerData, sortedProducerData);

    let counter;

    if (!sortedProducerData.every((p, i) => {
        counter = i;
        const cons = sortedConsumerData[i];
        return p.child === cons.child && p.action === cons.action;
    })){
        const error = [
            `Producer data and consumer data do not sort the same way as of record ${counter}:`,
            `    |             CONSUMER            |              PRODUCER            |`,
            `    | id | action    | timestamp      | id | action    | timestamp       |`
        ];
        sortedProducerData.forEach((p,i) => {
            if (i < counter || i > counter + 15)
                return;
            const c = sortedConsumerData[i];
            error.push(`  ${i < 10 ? `0${i}`: i}|  ${c.child} | ${c.action}    | ${c.timestamp}  | ${p.child}  | ${p.action}    | ${p.timestamp}   |`)
        })
        return callback(error.join('\n'), sortedConsumerData, sortedProducerData);
    }

    callback(undefined, sortedConsumerData, sortedProducerData);
}

/**
 * Util Class to simulate Producer Consumer scenarios for tests
 *
 * @class
 */
class ConsumerRunner {

    /**
     *
     * @param {string} action
     * @param {boolean} isAsync
     * @param {Function} consumerHandler method that will be called on each child's tick
     * @param {Function} [compareHandler] defaults to {@link defaultComparer}
     */
    constructor(action, isAsync, consumerHandler, compareHandler){
        this.action = action;
        this.isAsync = isAsync;
        this._handler = consumerHandler;
        this._comparerHandle = compareHandler || defaultComparer;
        this._reset();
    }

    _reset(){
        this._forkedCache = [];
        this._consumerResults = {};
        this._producerResults = {};
    }

    _store(identifier, action, timeout, times, count, random){
        let log = [Date.now(), "PRODUCER", identifier, action]
        if (timeout)
            log.push(timeout);
        if (times && count)
            log.push(`${count}/${times}`, random || false);

        log = log.join(' - ');
        this._producerResults[identifier] = this._producerResults[identifier] || [];
        this._producerResults[identifier].push(log);
    }

    _compareResults(callback){
        if (this.isAsync)
            return this._comparerHandle(this._consumerResults, this._producerResults, callback)
        try{
            callback(undefined, this._comparerHandle(this._consumerResults, this._producerResults));
        } catch (e){
            return callback(e);
        }
    }

    _tick(identifier, count, times, callback){
        const log = [Date.now(), "CONSUMER", identifier, this.action]
        this._consumerResults[identifier] = this._consumerResults[identifier] || [];
        this._consumerResults[identifier].push(log.join(' - '));

        if (Object.keys(this._producerResults).length === count && Object.keys(this._producerResults).every(k => this._producerResults[k].length === times)){
            if (this._forkedCache){
                this._forkedCache.forEach((forked, i) => {
                    forked.send({
                        identifier: i,
                        terminate: true
                    });
                });
                this._forkedCache = undefined;
            }
        }

        if (Object.keys(this._consumerResults).length === count && Object.keys(this._consumerResults).every(k => this._consumerResults[k].length === times))
            this._compareResults(callback)
    }

    /**
     *
     * @param {number} count how many child processes to spawn
     * @param {number} timeout delay, in ms, of child actions
     * @param {number} times how many times each child wil perform the action
     * @param {boolean} random if meant to apply randomness to the timeouts. if true, the provided {@param timeout} will be the max value;
     * @param {Function} callback
     */
    run(count, timeout, times, random, callback) {
        const self = this;
        self._reset();
        for(let i = 1; i < count + 1; i++){
            const forked = fork('./bin/ProducerChildProcess.js');
            self._forkedCache.push(forked);
            forked.on('message', (message) => {
                let {identifier, result, args, action, timeout, times, random} = message;

                self._store(identifier, action, timeout, times, count, random);

                args = args || [];

                try{
                    if (self.isAsync){
                        return self._handler(identifier, ...args, () => {
                            self._tick(identifier, count, times, callback);
                        });
                    }

                    self._handler(identifier, ...args);
                    self._tick(identifier, count, times, callback);
                } catch (e) {
                    return callback(e);
                }
            });
        }

        self._forkedCache.forEach((forked, i) => {
            forked.send({
                identifier: i,
                action: self.action,
                timeout: timeout,
                times: times,
                random: random
            })
        })
    }
}

module.exports = {
    ConsumerRunner,
    defaultComparer
}