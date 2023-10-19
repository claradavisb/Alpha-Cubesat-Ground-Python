import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import InputField from "./InputField";

// SFR field types
const SFR_Type = Object.freeze({
  Int: "INT",
  Float: "FLOAT",
  Time: "TIME",
  Bool: "BOOL",
});
export const SfrOverride = forwardRef(({ SFR_Data, setTitle }, ref) => {
  // Selected dropdown values
  const [selectedNamespace, setNamespace] = useState("None");
  const [selectedField, setField] = useState("None");

  // Dropdown item lists for namespaces and fields
  const [fieldList, setFieldList] = useState([]);
  const namespaceDropRef = useRef();
  const fieldDropRef = useRef();

  // Input field data and form error
  const [fieldData, setFieldData] = useState({});
  const [inputError, setInputError] = useState();
  const [timeUnit, setTimeUnit] = useState("SEC");

  const initialFieldData = {
    byteCount: "41111",
    value: "",
    setValue: true,
    setRestore: false,
    _filler: false, // nothing in byte 3 of f_arg_2
    restoreValue: false,
  };

  const [commandFields, setCommandFields] = useState(initialFieldData);

  const handleFieldChange = (event) => {
    let { name, value } = event.target;
    if (name === "setValue") value = !commandFields.setValue;
    else if (name === "setRestore") value = !commandFields.setRestore;

    setCommandFields((prevFields) => ({
      ...prevFields,
      [name]: value,
    }));
  };

  useImperativeHandle(ref, () => ({
    // Validates input field before adding command to the command builder
    handleSubmit() {
      if (selectedNamespace === "None" || selectedField === "None") return;

      let inputValue = commandFields.value;

      // validate input: make sure field is not empty, ints and floats are valid, input within min and max values
      let error = "";
      let int_check = new RegExp("^-?\\d+$");
      let float_check = new RegExp("^-?\\d+(\\.\\d+)?$");
      if (commandFields.setValue) {
        if (!inputValue) {
          error = "Field cannot be empty.";
        } else if (
          (fieldData.type === SFR_Type.Int ||
            fieldData.type === SFR_Type.Time) &&
          !int_check.test(inputValue)
        ) {
          error = "Not a valid integer.";
        } else if (
          fieldData.type === SFR_Type.Float &&
          !float_check.test(inputValue)
        ) {
          error = "Not a valid float.";
        } else if (fieldData.min !== undefined && inputValue < fieldData.min) {
          error = "Minimum value is " + fieldData.min;
        } else if (fieldData.max !== undefined && inputValue > fieldData.max) {
          error = "Maximum value is " + fieldData.max;
        }
      }
      setInputError(error);
      if (error.length > 0) return;

      // convert minutes and hours to seconds
      if (fieldData.type === SFR_Type.Time) {
        if (timeUnit === "SEC") {
          inputValue *= 1000;
        } else if (timeUnit === "MIN") {
          inputValue *= 60 * 1000;
        } else if (timeUnit === "HOUR") {
          inputValue *= 3600 * 1000;
        }
      }

      // add to command builder
      commandFields.value = inputValue;
      return {
        namespace: selectedNamespace[0],
        field: selectedField[0],
        value: commandFields,
      };
    },
  }));

  // Updates dropdown menus based on selected SFR namespace
  const handleNamespaceSelect = (namespace) => {
    setNamespace(namespace);
    if (namespace in SFR_Data) {
      setFieldList(Object.keys(SFR_Data[namespace]));
    } else {
      setFieldList([]);
    }
    resetFieldState();
    setTitle("No command selected");
  };

  // Updates input field based on selected SFR field
  const handleFieldSelect = (field) => {
    if (field in SFR_Data[selectedNamespace]) {
      setField(field);
      setFieldData(SFR_Data[selectedNamespace][field]);
      setInputError();
      if (SFR_Data[selectedNamespace][field].type === SFR_Type.Bool) {
        setCommandFields((prevFields) => ({
          ...prevFields,
          value: true,
        }));
      }
      setTitle("sfr::" + selectedNamespace + "::" + field);
    }
  };

  const resetFieldState = () => {
    setField("None");
    setFieldData({});
    setInputError();
    setCommandFields(initialFieldData);
    setTimeUnit("SEC");
    fieldDropRef.current.clear();
  };

  return (
    <div>
      <Row>
        {/* Namespace dropdown selection */}
        <Col>
          <span style={{ fontWeight: "bold" }}>Namespace</span>
          <Typeahead
            id="namespace-dropdown"
            labelKey="namespace"
            options={Object.keys(SFR_Data)}
            placeholder="Select"
            ref={namespaceDropRef}
            onChange={(selected) => handleNamespaceSelect(selected)}
            onInputChange={(selected) => handleNamespaceSelect(selected)}
            renderMenuItemChildren={(option) => <>{option}</>}
          />
        </Col>

        {/* SFR field dropdown selection */}
        <Col>
          <span style={{ fontWeight: "bold" }}>Field</span>
          <Typeahead
            id="field-dropdown"
            labelKey="field"
            options={fieldList}
            ref={fieldDropRef}
            disabled={!(selectedNamespace in SFR_Data)}
            placeholder="Select"
            onChange={(select) => handleFieldSelect(select)}
            onInputChange={(select) => handleFieldSelect(select)}
            renderMenuItemChildren={(option) => <>{option}</>}
          />
        </Col>
      </Row>
      {fieldData.type && (
        <Row>
          <Col>
            {/* SFR field input */}
            <div className="mt-2">
              <div className="mb-2">
                <span style={{ fontWeight: "bold" }}>Set Value</span>
                <Form.Check
                  name="setValue"
                  className="ms-2"
                  onChange={handleFieldChange}
                  defaultChecked
                  inline
                />
              </div>

              {(fieldData.type === SFR_Type.Time ||
                fieldData.type === SFR_Type.Float ||
                fieldData.type === SFR_Type.Int) && (
                <>
                  <InputField
                    name="value"
                    type="number"
                    className="mt-1"
                    placeholder="Value"
                    error={inputError}
                    onChange={handleFieldChange}
                    disabled={!commandFields.setValue}
                  />
                  {/* Time unit selector */}
                  {fieldData.type === SFR_Type.Time && (
                    <div className="mt-2">
                      <Form.Check
                        name="time_unit"
                        label="sec"
                        type="radio"
                        disabled={!commandFields.setValue}
                        onChange={() => setTimeUnit("SEC")}
                        inline
                        defaultChecked
                        className="me-2"
                      />
                      <Form.Check
                        name="time_unit"
                        label="min"
                        id="unit_minutes"
                        type="radio"
                        disabled={!commandFields.setValue}
                        onChange={() => setTimeUnit("MIN")}
                        inline
                        className="me-2"
                      />
                      <Form.Check
                        name="time_unit"
                        label="hr"
                        id="unit_hours"
                        type="radio"
                        disabled={!commandFields.setValue}
                        onChange={() => setTimeUnit("HOUR")}
                        inline
                        className="me-2"
                      />
                    </div>
                  )}
                </>
              )}
              {fieldData.type === SFR_Type.Bool && (
                <div className="mt-2">
                  <Form.Check
                    name="value"
                    type="radio"
                    label="true"
                    value="true"
                    disabled={!commandFields.setValue}
                    onChange={handleFieldChange}
                    inline
                    defaultChecked
                  />
                  <Form.Check
                    name="value"
                    type="radio"
                    label="false"
                    value="false"
                    disabled={!commandFields.setValue}
                    onChange={handleFieldChange}
                    inline
                  />
                </div>
              )}
            </div>
          </Col>
          <Col className="mt-2">
            <div>
              <div className="mb-2">
                <span style={{ fontWeight: "bold" }}>Set Restore</span>
                <Form.Check
                  name="setRestore"
                  className="ms-2"
                  onChange={handleFieldChange}
                  inline
                />
              </div>
              <Form.Check
                name="restoreValue"
                type="radio"
                label="true"
                value="true"
                disabled={!commandFields.setRestore}
                onChange={handleFieldChange}
                inline
              />
              <Form.Check
                name="restoreValue"
                type="radio"
                label="false"
                value="false"
                disabled={!commandFields.setRestore}
                onChange={handleFieldChange}
                inline
                defaultChecked
              />
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
});

export const EepromReset = forwardRef(({}, ref) => {
  const [inputError, setInputError] = useState();
  const [eepromFields, setEepromFields] = useState({
    byteCount: "122111",
    bootCount: "",
    sfrAddress: "",
    dataAddress: "",
    sfrWriteAge: "",
    dataWriteAge: "",
    lightSwitch: false,
  });

  useImperativeHandle(ref, () => ({
    handleSubmit() {
      return {
        value: {
          byteCount: eepromFields.byteCount,
          bootCount: eepromFields.bootCount,
          lightSwitch: eepromFields.lightSwitch,
          sfrAddress: eepromFields.sfrAddress,
          dataAddress: eepromFields.dataAddress,
          // range is 0-95000 and we need to map them to 1 byte
          sfrWriteAge: Math.floor(parseInt(eepromFields.sfrWriteAge) / 373),
          dataWriteAge: Math.floor(parseInt(eepromFields.dataWriteAge) / 373),
        },
      };
    },
  }));

  const handleEepromChange = (event) => {
    const { name, value } = event.target;
    setEepromFields((prevFields) => ({
      ...prevFields,
      [name]: value,
    }));
  };

  return (
    <div>
      <Row className="mb-2">
        {/* 1st Row */}
        <Col>
          <InputField
            name="bootCount"
            type="number"
            className="mt-1"
            placeholder={"Boot count"}
            error={inputError}
            onChange={handleEepromChange}
          />
        </Col>
        <Col className="d-flex flex-column justify-content-center align-items-center">
          <div>
            <Form.Check
              name="lightSwitch"
              label="Light 1"
              type="radio"
              value="true"
              inline
              defaultChecked
              onChange={handleEepromChange}
            />
            <Form.Check
              name="lightSwitch"
              label="Light 0"
              type="radio"
              value="false"
              inline
              onChange={handleEepromChange}
            />
          </div>
        </Col>
      </Row>
      <Row className="mb-2">
        {/* 2nd Row */}
        <Col>
          <InputField
            name="sfrAddress"
            type="number"
            className="mt-1"
            placeholder={"SFR address"}
            error={inputError}
            onChange={handleEepromChange}
          />
        </Col>
        <Col>
          <InputField
            name="dataAddress"
            type="number"
            className="mt-1"
            placeholder={"Data address"}
            error={inputError}
            onChange={handleEepromChange}
          />
        </Col>
      </Row>
      <Row className="mb-2">
        {/* 3rd Row */}
        <Col>
          <InputField
            name="sfrWriteAge"
            type="number"
            className="mt-1"
            placeholder={"SFR write age"}
            error={inputError}
            onChange={handleEepromChange}
          />
        </Col>
        <Col>
          <InputField
            name="dataWriteAge"
            type="number"
            className="mt-1"
            placeholder={"Data write age"}
            error={inputError}
            onChange={handleEepromChange}
          />
        </Col>
      </Row>
    </div>
  );
});
