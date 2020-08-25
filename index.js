const fs = require('fs');
const csv = require('csv-parse/lib/sync');
const _ = require('lodash');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const validator = require("email-validator");

class Student {

    constructor(eid, fullname) {
        this.fullname = fullname;
        this.eid = eid;
        this.classes = '';
        this.addresses = [];
        this.invisible = false;
        this.see_all = false;
    }

    addClass(classe) {
        if (this.classes === '') {
            this.classes = classe;
            return;
        } else if (!Array.isArray(this.classes)) {
            let classes = [];
            classes.push(this.classes);
            this.classes = classes;
        }
        // Caso ainda não possua essa classe ele adiciona no array
        if (!_.includes(this.classes, classe)) {
            this.classes.push(classe);
        }
    }

    addAdress(address) {
        this.addresses.push(address);
    }
}

class Address {

    constructor(typeAndTags, address) {
        this.type = this.getAddressType(typeAndTags);
        this.tags = this.getAddressTags(typeAndTags);
        this.address = address;
    }

    addTag(tag) {
        // Caso ainda não possua essa tag ele adiciona no array
        if (!_.includes(this.tags, tag)) {
            this.tags.push(tag);
        }
    }

    isAddressValid() {
        if (this.type === 'phone') {
            return this.isPhoneValid('BR');
        } else if (this.type === 'email') {
            return this.isEmailValid();
        }
    }

    isPhoneValid(country) {
        
        let number;

        try {
            number = phoneUtil.parseAndKeepRawInput(this.address, country);
            this.address = this.formatedPhone(number);
        } catch(err) {
            return false;
        }

        return phoneUtil.isValidNumberForRegion(number, country);
    }

    isEmailValid() {

        return validator.validate(this.address);
    }

    getAddressType(string) {

        return _.split(string, ' ')[0];
    }

    getAddressTags(string) {

        let type = this.getAddressType(string);
        string = string.slice(type.length+1);
        return StudentsParser.splitString(string, '/', ',');
    }

    formatedPhone(number) {

        let formatedNumber = '' + number.getCountryCode() + number.getNationalNumber();

        return formatedNumber;
    }
}

class StudentsParser {

    constructor() {
        this.students = [];
    }

    parse(inputFile, outputFile) {

        const input = this.readInput(inputFile);
        const records = this.csvParse(input);

        // Para cada linha de informação de input.csv
        for (let record of records) {

            let student = this.findStudent(record['eid']);

            // Caso não encontre o estudante pelo seu eid, cria outro
            if (student === undefined) {

                this.students.push(new Student(record['eid'], record['fullname']));
                student = this.findStudent(record['eid'])
            }
            delete(record['eid']);
            delete(record['fullname']);

            // Para cada coluna class de input.csv
            for (let classes of record['class']) {
                if (classes !== '') {
                    // Divide em pedaços as strings que contém valores separados por barra 
                    // ou vírgula e retorna os valores em um array.
                    // ex: 'Sala 1 / Sala 2' => ['Sala 1', 'Sala 2']
                    let splitClasses = StudentsParser.splitString(classes, '/', ',');
                    for (let eachClass of splitClasses) {
                        student.addClass(eachClass);
                    }
                }
            }
            delete(record['class']);

            // Caso o campo 'invisible' esteja vazio ele é ignorado
            if (record['invisible'] !== '')
                student.invisible = this.getBoolean(record['invisible']);
            delete(record['invisible']);

            // Caso o campo 'see_all' esteja vazio ele é ignorado
            if (record['see_all'] !== '')
                student.see_all = this.getBoolean(record['see_all']);
            delete(record['see_all']);

            // Para cada coluna de endereço
            for (let obj in record) {

                // Divide em pedaços a string de endereços que contém valores separados por barra 
                // ou vírgula e retorna os valores em um array
                let splitAddresses = StudentsParser.splitString(record[obj], '/', ',');

                for (let eachAddress of splitAddresses) {

                    let address = this.findAddress(student, eachAddress);

                    // Caso não encontre esse endereço dentro de estudante, cria um novo 
                    // e o adiciona caso seja um endereço válido
                    if (address === undefined) {
                        address = new Address(obj, eachAddress);
                        if (address.isAddressValid()) {
                            student.addAdress(address);
                        }
                    // Caso encontre, junta suas tags
                    } else {
                        let splitTags = address.getAddressTags(obj);
                        for (let eachTag of splitTags) {
                            address.addTag(eachTag);
                        }
                    }
                }
                delete(record[obj]);
            }
        }
        this.writeOutput(this.students, outputFile);
    }

    readInput(inputFile) {
        const input = fs.readFileSync('./' + inputFile, 'utf-8', (err, fileContent) => {
            if(err) {
                throw new Error('Arquivo não encontrado');
            }
            return fileContent;
        });
        return input;
    }

    csvParse(input) {
        const records = csv(input, {
            columns: true,
            columns_duplicates_to_array: true,
            skip_empty_lines: true
        });
        return records;
    }

    writeOutput(array, fileName) {

        let data = JSON.stringify(array, null, 2);
        fs.writeFile(fileName, data, function(err) {});
    }

    // Separa string, que contenha 'separator1' e/ou 'separator2' como separadores, em um array de strings
    static splitString(string, separator1, separator2) {

        let result = [];
        let resultAux = _.split(string, separator1);

        _.forEach(resultAux, obj => {
            obj = _.split(obj, separator2);
            _.forEach(obj, objAux => {
                result.push(objAux);
            });
        });
        return _.map(result, _.trim);
    }

    findStudent(eid) {

        return _.find(this.students, o => o.eid === eid);
    }

    findAddress(student, address) {
        
        return _.find(student.addresses, o => o.address === address);
    }

    getBoolean(value)  {

        switch(value) {
            case true:
            case "true":
            case 1:
            case "1":
            case "on":
            case "yes":
                return true;
            default: 
                return false;
        }
    }
}


let studentsParser = new StudentsParser();
studentsParser.parse('input.csv', 'output.json');