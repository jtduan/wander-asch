module.exports = {
    name: 'plays',
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
            name: 'gameid',
            type: 'String',
            length: '20',
            not_null: true,
        },
        {
            name: 'choice',
            type: 'Number',
            not_null: true,
            default: 0
        }
    ]
}