import React from 'react';
import { shallow, mount } from 'enzyme';
import chaiEnzyme from 'chai-enzyme';
import chai, { expect } from 'chai';
import { ControlWrapper } from 'form-builder/components/ControlReduxWrapper.jsx';
import sinon from 'sinon';
import { getStore } from 'test/utils/storeHelper';
import {
  focusControl,
  selectControl,
} from 'form-builder/actions/control';
import { formBuilderConstants } from 'form-builder/constants';
import { ComponentStore } from 'bahmni-form-controls';
import {
  dragSourceUpdate,
} from 'form-builder/actions/control';
import DragDropHelper from 'form-builder/helpers/dragDropHelper';

chai.use(chaiEnzyme());

describe('ControlWrapper', () => {
  // eslint-disable-next-line
  const testControl = (props) => (<div>{ props.metadata.value }</div>);
  testControl.injectConceptToMetadata = (metadata, concept) => Object.assign({}, metadata, {
    concept: {
      name: concept.name.name,
      uuid: concept.uuid,
      datatype: concept.datatype.name,
    },
  });
  const bahmniIDGenerator = window.bahmniIDGenerator;
  const metadata = {
    id: '1',
    type: 'testType',
    value: 'testValue',
  };
  before(() => {
    ComponentStore.registerDesignerComponent('testType', { control: testControl });
    window.bahmniIDGenerator = {
      getId: () => 1,
    };
  });

  after(() => {
    ComponentStore.deRegisterDesignerComponent('testType');
    window.bahmniIDGenerator = bahmniIDGenerator;
  });

  it('should render a control with the given metadata', () => {
    const controlWrapper = mount(
      <ControlWrapper
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
        store={ getStore() }
      />);
    expect(controlWrapper.find('.control-wrapper').children().text()).to.eql(metadata.value);
  });

  it('should be draggable', () => {
    const controlWrapper = mount(
      <ControlWrapper
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
        store={ getStore() }
      />);

    expect(controlWrapper.find('.control-wrapper')).to.have.prop('onDragStart');
    expect(controlWrapper.find('.control-wrapper').children()).to.have.prop('onSelect');
  });

  it('should update context with concepts on change of conceptToControlMap', () => {
    const store = getStore();
    const controlWrapper = shallow(
      <ControlWrapper
        dispatch={ store.dispatch }
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
      />);

    const conceptToControlMap = {
      1: {
        uuid: 'c37bd733-3f10-11e4-adec-0800271c1b75',
        display: 'Temperature',
        name: {
          uuid: 'c37bdec5-3f10-11e4-adec-0800271c1b75',
          name: 'Temperature',
        },
        conceptClass: {
          uuid: '8d492774-c2cc-11de-8d13-0010c6dffd0f',
          name: 'Misc',
        },
        datatype: {
          uuid: '8d4a4488-c2cc-11de-8d13-0010c6dffd0f',
          name: 'Numeric',
        },
        setMembers: [],
      },
    };

    controlWrapper.setProps({ conceptToControlMap });
    const concept = {
      name: 'Temperature',
      uuid: 'c37bd733-3f10-11e4-adec-0800271c1b75',
      datatype: 'Numeric',
    };


    const expectedMetadata = {
      id: '1',
      type: 'testType',
      value: 'testValue',
      concept,
    };
    const actualMetadata = controlWrapper.find('.control-wrapper').children().prop('metadata');
    expect(actualMetadata).to.deep.eql(expectedMetadata);
    sinon.assert.calledOnce(store.dispatch.withArgs(selectControl(expectedMetadata, true)));
  });

  it('should update properties when changed', () => {
    const store = getStore();
    const controlWrapper = shallow(
      <ControlWrapper
        dispatch={ store.dispatch }
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
      />);
    const instance = controlWrapper.instance();
    instance.childControl = { getJsonDefinition: () => metadata };
    const controlProperty = { id: '1', property: { mandatory: true } };
    controlWrapper.setProps({ controlProperty });

    const expectedMetadata = Object.assign({}, metadata, { properties: { mandatory: true } });
    const actualMetadata = controlWrapper.find('.control-wrapper').children().prop('metadata');
    expect(actualMetadata).to.deep.eql(expectedMetadata);
    sinon.assert.calledOnce(store.dispatch.withArgs(selectControl(expectedMetadata)));
  });

  it('should update properties when changed for a section', () => {
    ComponentStore.registerDesignerComponent('section', { control: testControl });
    const store = getStore();
    const sectionMetadata = {
      id: '1',
      type: 'section',
    };
    const controlWrapper = shallow(
      <ControlWrapper
        dispatch={ store.dispatch }
        metadata={ sectionMetadata }
        onUpdateMetadata={ () => {} }
      />);
    const instance = controlWrapper.instance();
    instance.childControl = { getJsonDefinition: () => sectionMetadata };
    const controlProperty = { id: '1', property: { addMore: true } };
    controlWrapper.setProps({ controlProperty });

    const expectedMetadata = Object.assign({}, sectionMetadata, { properties: { addMore: true } });
    const actualMetadata = controlWrapper.find('.control-wrapper').children().prop('metadata');
    expect(actualMetadata).to.deep.eql(expectedMetadata);
    sinon.assert.calledOnce(store.dispatch.withArgs(selectControl(expectedMetadata)));
    ComponentStore.deRegisterDesignerComponent('section');
  });

  it('should not update properties when metadata id is different', () => {
    const store = getStore();
    const controlWrapper = shallow(
      <ControlWrapper
        dispatch={ store.dispatch }
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
      />);
    const instance = controlWrapper.instance();
    instance.childControl = { getJsonDefinition: () => metadata };
    const controlProperty = { id: 'someOtherId', property: { mandatory: true } };
    controlWrapper.setProps({ controlProperty });

    const actualMetadata = controlWrapper.find('.control-wrapper').children().prop('metadata');
    expect(actualMetadata).to.deep.eql(metadata);
    sinon.assert.callCount(store.dispatch, 0);
  });

  it('should dispatch selectControlId', () => {
    const store = getStore();
    const controlWrapper = shallow(
      <ControlWrapper
        dispatch={ store.dispatch }
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
      />);

    controlWrapper.instance().onSelected({ stopPropagation: () => {} }, '1');
    sinon.assert.calledOnce(store.dispatch.withArgs(selectControl('1')));
  });

  it('should always set the control event to false when control ' +
      'with controlEvent is selected', () => {
    const store = getStore();
    const controlWrapper = shallow(
      <ControlWrapper
        dispatch={ store.dispatch }
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
      />);

    const controlMetadata = { properties: { controlEvent: true } };
    controlWrapper.instance().onSelected({ stopPropagation: () => {} },
      controlMetadata);
    sinon.assert.calledOnce(store.dispatch);
    expect(store.dispatch.getCall(0).args[0].metadata.properties.controlEvent).to.eq(false);
  });

  it('should dispatch focused Control id', () => {
    const store = getStore();
    const controlWrapper = mount(
      <ControlWrapper
        dispatch={ store.dispatch }
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
      />);

    controlWrapper.find('.control-wrapper').simulate('focus');
    sinon.assert.calledOnce(store.dispatch.withArgs(focusControl('1')));
  });

  it('should set the updated metadata as the drag data', () => {
    const store = getStore();
    const controlWrapperShallow = shallow(
      <ControlWrapper
        dispatch={ store.dispatch }
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
      />);
    const controlWrapper = controlWrapperShallow.instance();
    sinon.stub(controlWrapper, 'getJsonDefinition');

    controlWrapper.processDragStart();
    sinon.assert.calledOnce(controlWrapper.getJsonDefinition);
  });

  it('should use the available metadata if the control returns undefined metadata', () => {
    const store = getStore();
    const controlWrapperShallow = shallow(
      <ControlWrapper
        dispatch={ store.dispatch }
        metadata={ metadata }
      />);
    const controlWrapper = controlWrapperShallow.instance();
    sinon.stub(controlWrapper, 'getJsonDefinition').callsFake(() => undefined);

    const newMetadata = controlWrapper.processDragStart();
    expect(newMetadata).to.eql(metadata);
  });

  it('should show the delete confirm box if the state showDeleteModal equal true', () => {
    const store = getStore();
    const controlWrapper = shallow(
      <ControlWrapper
        deleteControl={() => {}}
        dispatch={ store.dispatch }
        metadata={ metadata }
        showDeleteButton
      />);

    expect(controlWrapper.find('.control-wrapper')).to.not.have.descendants('DeleteControlModal');
    controlWrapper.setState({ showDeleteModal: true });
    controlWrapper.instance().forceUpdate();
    expect(controlWrapper.find('.control-wrapper')).to.have.descendants('DeleteControlModal');
  });

  it('should not show script editor if the property id not equal metadata\'s id', () => {
    const store = getStore();
    const controlProperty = { id: '2', property: { controlEvent: true } };
    const controlWrapper = shallow(
      <ControlWrapper
        dispatch={ store.dispatch }
        metadata={ metadata }
      />);

    expect(controlWrapper.find('.control-wrapper')).to.not.have.descendants('ScriptEditorModal');

    const instance = controlWrapper.instance();
    instance.childControl = { getJsonDefinition: () => metadata };
    controlWrapper.setProps({ controlProperty,
      selectedControl: { events: { onValueChange: '' } } });

    expect(controlWrapper.find('.control-wrapper')).to.not.have.descendants('ScriptEditorModal');
  });

  it('getJsonDefinition should return json if present', () => {
    const store = getStore();
    const controlWrapper = shallow(
      <ControlWrapper
        dispatch={ store.dispatch }
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
      />);
    const instance = controlWrapper.instance();
    instance.childControl = { getJsonDefinition: () => metadata };

    expect(instance.getJsonDefinition()).to.deep.eql(metadata);
  });

  it('getJsonDefinition should throw exception when childControl returns undefined', () => {
    const store = getStore();
    const controlWrapper = shallow(
      <ControlWrapper
        dispatch={ store.dispatch }
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
      />);
    const instance = controlWrapper.instance();
    instance.childControl = { getJsonDefinition: () => undefined };

    const conceptMissingMessage = formBuilderConstants.exceptionMessages.conceptMissing;
    expect(instance.getJsonDefinition.bind(instance)).to.throw(conceptMissingMessage);
  });

  it('should reset the drag source to undefined after the drop is done', () => {
    const store = getStore();
    const controlWrapper = shallow(
      <ControlWrapper
        dispatch={ store.dispatch }
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
      />);

    const instance = controlWrapper.instance();
    const dragDrophelperStub = sinon.stub(DragDropHelper, 'processControlDrop');
    instance.handleControlDrop({ metadata });
    sinon.assert.calledOnce(store.dispatch.withArgs(dragSourceUpdate(undefined)));
    dragDrophelperStub.restore();
  });

  it('should update events of control from redux store', () => {
    const store = getStore();
    const controlWrapper = shallow(
      <ControlWrapper
        allObsControlEvents={[{
          id: '1',
          events: 'Control Event',
        }]}
        dispatch={ store.dispatch }
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
      />);
    const instance = controlWrapper.instance();
    instance.childControl = { getJsonDefinition: () => metadata };
    const jsonDefinition = instance.getJsonDefinition();

    expect(jsonDefinition.events).to.eql('Control Event');
  });

  it('should not update events of control from redux store when id is not present', () => {
    const store = getStore();
    const controlWrapper = shallow(
      <ControlWrapper
        allObsControlEvents={[{
          id: '2',
          events: 'Control Event',
        }]}
        dispatch={ store.dispatch }
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
      />);
    const instance = controlWrapper.instance();
    instance.childControl = { getJsonDefinition: () => metadata };
    const jsonDefinition = instance.getJsonDefinition();

    expect(jsonDefinition.events).to.eql(undefined);
  });

  it('should update control event in metadata object from the redux state', () => {
    const store = getStore();
    const controlWrapper = shallow(
      <ControlWrapper
        allObsControlEvents={[{
          id: '1',
        }]}
        dispatch={ store.dispatch }
        metadata={ metadata }
        onUpdateMetadata={ () => {} }
      />);
    const instance = controlWrapper.instance();
    controlWrapper.setProps({ allObsControlEvents: [{ id: '1', events: 'Control Event' }] });

    expect(instance.metadata.events).to.eq('Control Event');
  });
});
