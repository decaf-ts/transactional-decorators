### Description

Standalone module, exposes a simple implementation to handle concurrency:
- Simple yet powerful locking;
- decorate methods as `@transactional()` for control;
- decorate classes as `@Transactional()`, enabling Instance proxying and keeping transactions across different classes/method calls (grouping several calls in a sing transaction)l
- Customizable Transaction Lock;
- Seamless integration with `db-decorators`;