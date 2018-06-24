module.exports = {
    name: 'games',
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
            name: 'leftp',
            type: 'String',
            length: 256,
            not_null: true
        },
        {
            name: 'midp',
            type: 'String',
            length: 256,
            not_null: true
        },
        {
            name: 'rightp',
            type: 'String',
            length: 256,
            not_null: true
        },
        {
            name: 'startc',
            type: 'Number',
            not_null: true,
            default: 0
        },
        {
            name: 'totalc',
            type: 'Number',
            not_null: true,
            default: 0
        },
        {
            name: 'status',
            type: 'Number',
            not_null: true,
            default: 0
        }
    ]
}