const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const _ = require('lodash');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
var validator = require("email-validator");



class Student {
    constructor(eid, fullname) {
        this.fullname = fullname;
        this.eid = eid;
        this.classes = [];
        this.addresses = [];
        this.invisible = false;
        this.see_all = false;
    }

    addClass(classe) {
        if (_.indexOf(this.classes, classe) === -1) {
            this.classes.push(classe);
        }
    }

    addAdress(address) {
        this.addresses.push(address);
    }
}

class Address {
    constructor(typeAndTags, address) {
        this.type = getAddressType(typeAndTags);
        this.tags = getAddressTags(typeAndTags);
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

    formatedPhone(number) {

        let formatedNumber = '' + number.getCountryCode() + number.getNationalNumber();

        return formatedNumber;
    }
}



// Lê o arquivo input.csv
const input = fs.readFileSync('./input.csv', 'utf-8', (err, fileContent) => {
    if(err) {
        throw new Error(err);
    }
    return fileContent;
});

// Transforma o input em objetos js
const records = parse(input, {
    columns: true,
    columns_duplicates_to_array: true,
    skip_empty_lines: true
});

// Arruma o objeto para o formato de Student
let students = [];
for (record of records) {

    let student = findStudent(record['eid']);

    if (student === undefined) {

        students.push(new Student(record['eid'], record['fullname']));
        student = findStudent(record['eid'])
    }
    delete(record['eid']);
    delete(record['fullname']);

    for (classes of record['class']) {
        if (classes !== '') {
            let splitClasses = splitString(classes);
            for (eachClass of splitClasses) {
                student.addClass(eachClass);
            }
        }
    }
    delete(record['class']);

    if (record['invisible'] !== '')
        student.invisible = getBoolean(record['invisible']);
    delete(record['invisible']);

    if (record['see_all'] !== '')
        student.see_all = getBoolean(record['see_all']);
    delete(record['see_all']);

    for (obj in record) {
        let splitAddresses = splitString(record[obj]);
        for (eachAddress of splitAddresses) {

            let address = findAddress(student, eachAddress);

            if (address === undefined) {
                address = new Address(obj, eachAddress);
                if (address.isAddressValid()) {
                    student.addAdress(address);
                }
            } else {
                let splitTags = getAddressTags(obj);
                for (eachTag of splitTags) {
                    address.addTag(eachTag);
                }
            }
        }
        delete(record[obj]);
    }
    delete(record);
}

writeOutput(students, 'output.json');



// Transforma em json
function writeOutput(objects, fileName) {

    let data = JSON.stringify(objects, null, 2);
    fs.writeFile(fileName, data, function(err) {});
}

// Separa string, que contenha '/' e/ou ',' como separadores, em um array de strings
function splitString(string) {

    let result = [];
    let resultAux = _.split(string, '/');

    _.forEach(resultAux, obj => {
        obj = _.split(obj, ',');
        _.forEach(obj, objAux => {
            result.push(objAux);
        });
    });
    return _.map(result, _.trim);
}

function findStudent(eid) {

    return _.find(students, o => o.eid === eid);
}

function findAddress(student, address) {
    
    return _.find(student.addresses, o => o.address === address);
}

function getAddressType(string) {

    return _.split(string, ' ')[0];
}

function getAddressTags(string) {

    let type = getAddressType(string);
    string = string.slice(type.length+1);
    return splitString(string);
}

function getBoolean(value)  {

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