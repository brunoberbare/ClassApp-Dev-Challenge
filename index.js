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
        if (_.findIndex(this.classes, o => o.classe === classe) === -1) {
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
        if (_.indexOf(this.tags, tag) === -1) {
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

        for (let record of records) {

            let student = this.findStudent(record['eid']);

            if (student === undefined) {

                this.students.push(new Student(record['eid'], record['fullname']));
                student = this.findStudent(record['eid'])
            }
            delete(record['eid']);
            delete(record['fullname']);

            for (let classes of record['class']) {
                if (classes !== '') {
                    let splitClasses = StudentsParser.splitString(classes, '/', ',');
                    for (let eachClass of splitClasses) {
                        student.addClass(eachClass);
                    }
                }
            }
            delete(record['class']);

            if (record['invisible'] !== '')
                student.invisible = this.getBoolean(record['invisible']);
            delete(record['invisible']);

            if (record['see_all'] !== '')
                student.see_all = this.getBoolean(record['see_all']);
            delete(record['see_all']);

            for (let obj in record) {
                let splitAddresses = StudentsParser.splitString(record[obj], '/', ',');
                for (let eachAddress of splitAddresses) {

                    let address = this.findAddress(student, eachAddress);

                    if (address === undefined) {
                        address = new Address(obj, eachAddress);
                        if (address.isAddressValid()) {
                            student.addAdress(address);
                        }
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