import { useRef, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import { useDashboard } from "../contexts/DashboardProvider";
import namespaces, { Types } from "./SFR_Overrides";
import InputField from "./InputField";
import { Typeahead } from 'react-bootstrap-typeahead';

// Allowed opcodes
export const OpCodes = Object.freeze({
  SFR_Override: "SFR_Override",
  Deploy: "Deploy",
  Arm: "Arm",
  Fire: "Fire",
});

export default function CommandSelector() {
  const { commandStack, setCommandStack, count, setCount } = useDashboard();

  // Selected dropdown values
  const [selectedOpCode, setOpCode] = useState("None");
  const [selectedNamespace, setNamespace] = useState("None");
  const [selectedField, setField] = useState("None");

  // Dropdown item lists for namespaces and fields
  const [namespaceList, setNamespaceList] = useState([]);
  const [fieldList, setFieldList] = useState([]);
  const [fieldInput, setFieldInput] = useState();
  const typeaheadRef = useRef(); 

  // Input field data and form error
  const [fieldData, setFieldData] = useState({});
  const [inputError, setInputError] = useState();
  const fieldInputRef = useRef();

  // Command title and description
  const [title, setTitle] = useState("No command selected");
  const [desc, setDesc] = useState("Select a command");

  // Updates dropdown menus based on selected opcode
  const handleOpCodeSelect = (opcode) => () => {
    setOpCode(opcode);

    setNamespaceList(
      opcode === OpCodes.SFR_Override ? Object.keys(namespaces) : []
    );
    setFieldList([]);
    setNamespace("None");
    setField("None");
    setFieldData({});
    setFieldInput(undefined)
    setInputError();

    setTitle(opcode !== OpCodes.SFR_Override ? opcode : "No command selected");
    setDesc("Select a command");
  };

  // Updates dropdown menus based on selected SFR namespace
  const handleNamespaceSelect = (namespace) => {
    setNamespace(namespace);
    if (namespace in namespaces) {
      console.log("hello")
      setFieldList(Object.keys(namespaces[namespace]))    
    }
    else {
      setFieldList([])
    }
    setField("None");
    setFieldData({});
    setInputError();
    setTitle("No command selected");
    setDesc("Select a command");
  };

  // Updates input field based on selected SFR field
  const handleFieldSelect = (field) => {
    if (field in namespaces[selectedNamespace]) {
      setField(field);
      setFieldData(namespaces[selectedNamespace][field]);
      setInputError();

      setTitle("sfr::" + selectedNamespace + "::" + field);
      // setDesc();
    }
  };

  // Validates input field before adding command to the command builder
  function handleSubmit(event) {
    event.preventDefault();

    let input_value = "";
    if (selectedOpCode === OpCodes.SFR_Override) {
      input_value =
        fieldData.type !== Types.Bool
          ? fieldInputRef.current.value
          : fieldInputRef.current.checked.toString();

      // validate input: make sure field is not empty, ints and floats are valid, input within min and max values
      let error = "";
      let int_check = new RegExp("^-?\\d+$");
      let float_check = new RegExp("^-?\\d+(\\.\\d+)?$");
      if (!input_value) {
        error = "Field cannot be empty.";
      } else if (
        (fieldData.type === Types.Int ||
          fieldData.type === Types.Minute ||
          fieldData.type === Types.Hour) &&
        !int_check.test(input_value)
      ) {
        error = "Not a valid integer.";
      } else if (
        fieldData.type === Types.Float &&
        !float_check.test(input_value)
      ) {
        error = "Not a valid float.";
      } else if (fieldData.min !== undefined && input_value <= fieldData.min) {
        error = "Minimum value is " + fieldData.min;
      } else if (fieldData.max !== undefined && input_value >= fieldData.max) {
        error = "Maximum value is " + fieldData.max;
      }
      setInputError(error);
      if (error.length > 0) return;
    }

    // add to command builder
    let new_command = {
      id: count,
      opcode: selectedOpCode,
      ...(selectedOpCode === OpCodes.SFR_Override && {
        namespace: selectedNamespace,
        field: selectedField,
        value: input_value,
      }),
    };
    setCommandStack([...commandStack, new_command]);
    setCount(count + 1);

    // reset dropdowns
    setOpCode("None");
    setNamespaceList([]);
    setFieldList([]);
    setNamespace("None");
    setField("None");
    setFieldData({});
    setInputError();
    setTitle("No command selected");
    setDesc("Select a command");
  }

  return (
    <Container>
      {/* Command Title and Description */}
      <Row>
        <h4>
          {title !== "No Command Selected" ? title : "No Command Selected"}
        </h4>
        <p>{desc}</p>
        <hr />
      </Row>

      {/* Opcode dropdown selection*/}
      <Row>
        <Col>
          <span style={{ fontWeight: "bold" }}>Opcode</span>
          <Dropdown>
            <Dropdown.Toggle variant="success" id="dropdown-basic">
              {selectedOpCode}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {Object.keys(OpCodes).map((option, index) => (
                <Dropdown.Item key={index} onClick={handleOpCodeSelect(option)}>
                  {option}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Col>

        {/* Namespace dropdown selection*/}
        <Col classname="justify-content-mid" md={4}>
          <span style={{ fontWeight: "bold" }}>Namespace</span>
          {selectedOpCode === "SFR_Override" ? (          
          <Typeahead
            id="searchable-dropdown"
            labelKey="namespace"
            options={namespaceList}
            disabled={selectedOpCode !== "SFR_Override"}
            placeholder="namespace..."
            onChange={(selected) => handleNamespaceSelect(selected)}
            onInputChange={(selected => handleNamespaceSelect(selected))}
            renderMenuItemChildren={(option, { text }) => (
              <>
                {option}
              </>
      )}
    />) : null}
        </Col>

        {/* SFR field dropdown selection*/}
        <Col>
          <span style={{ fontWeight: "bold" }}>Field</span>
          {selectedNamespace in namespaces ? (          
          <Typeahead
          id="second-searchable-dropdown"
          labelKey="field"
          options={fieldList}
          disabled={selectedOpCode !== "SFR_Override"}
          placeholder="field..."
          onChange={(select) => handleFieldSelect(select)}
          onInputChange={(select) => handleFieldSelect(select)}
          renderMenuItemChildren={(option, { text }) => (
            <>
              {option}
            </>
        )}
        />) : null}

      {/* SFR field input */}
      <Row className="mt-3 mb-3">
        <Col className="justify-content-end" md={14}>
          <Form onSubmit={handleSubmit} noValidate>
          <span className = "mb-3" style={{ position: 'absolute', top: '220px',fontWeight: "bold"}}>Field Argument</span>

            {fieldData.type && fieldData.type !== Types.Bool && (
              <InputField
                name="sfr_override"
                type="number"
                className = "mt-4"
                placeholder={
                  (fieldData.type === Types.Minute && "Min") ||
                  (fieldData.type === Types.Hour && "Hr")
                }
                error={inputError}
                fieldRef={fieldInputRef}
              />
            )}
            {fieldData.type === Types.Bool && (
              <>
                <Form.Check
                  className = "mt-3"
                  name="sfr_override"
                  label="true"
                  type="radio"
                  inline
                  defaultChecked
                  ref={fieldInputRef}
                />
                <Form.Check
                  className = "mt-3"
                  name="sfr_override"
                  label="false"
                  type="radio"
                  inline
                />
              </>
            )}
            {/* Submit disabled if no opcode selected or SFR override selected but no namespace or field selected */}
            <Button
              style={{ position: 'absolute', left:'30px', bottom: '30px'}}
              variant="primary"
              type="submit"
              disabled={
                selectedOpCode === "None" ||
                (selectedOpCode === OpCodes.SFR_Override &&
                  (selectedNamespace === "None" || selectedField === "None"))
              }
              className="mt-2"
            >
              + Command
            </Button>
          </Form>
          </Col>
         </Row>
        </Col>
      </Row>
    </Container>
  );
}
