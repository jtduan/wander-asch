module.exports = {
    name: 'orders',
    fields: [
        {
            name: 'id',
            type: 'String',
            length: '20',
            not_null: true,
            primary_key: true
        },
        {
            name: 'address',
            type: 'String',
            length: 256,
            not_null: true,
            index: true
        },
        {
            name: 'number',
            type: 'String',
            length: 256,
            not_null: true
        },
        {
            name: 'status',
            type: 'Number',
            not_null: true,
            default: 0
        }
    ]
}