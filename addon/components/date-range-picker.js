import { assert } from '@ember/debug';
import $ from 'jquery';
import Component from '@ember/component';
import { cancel, scheduleOnce } from '@ember/runloop';
import { isEmpty } from '@ember/utils';
import { computed } from '@ember/object';
import moment from 'moment';
import layout from '../templates/components/date-range-picker';

const noop = function() {};

export default Component.extend({
  layout,
  classNameBindings: ['containerClass'],
  attributeBindings: ['start', 'end', 'serverFormat'],
  start: undefined,
  end: undefined,
  minDate: undefined,
  maxDate: undefined,
  timePicker: false,
  timePicker24Hour: false,
  timePickerSeconds: false,
  timePickerIncrement: undefined,
  showWeekNumbers: false,
  showDropdowns: false,
  linkedCalendars: false,
  datelimit: false,
  parentEl: 'body',
  format: 'MMM D, YYYY',
  serverFormat: 'YYYY-MM-DD',
  rangeText: computed('start', 'end', function() {
    let format = this.get('format');
    let serverFormat = this.get('serverFormat');
    let start = this.get('start');
    let end = this.get('end');
    if (!isEmpty(start) && !isEmpty(end)) {
      return moment(start, serverFormat).format(format) + this.get('separator') +
        moment(end, serverFormat).format(format);
    }
    return '';
  }),
  opens: null,
  drops: null,
  separator: ' - ',
  singleDatePicker: false,
  placeholder: null,
  containerClass: "form-group",
  inputClass: "form-control",
  inputClasses: computed('inputClass', function() {
    let inputClass = this.get('inputClass');
    return (inputClass ? 'daterangepicker-input ' + inputClass : 'daterangepicker-input');
  }),
  buttonClasses: ['btn'],
  applyClass: null,
  cancelClass: null,
  labelClass: null,
  direction: 'ltr',
  ranges: {
    'Today': [moment().startOf('day'), moment().endOf('day')],
    'Yesterday': [moment().subtract(1, 'days').startOf('day'), moment().subtract(1, 'days').endOf('day')],
    'Last 7 Days': [moment().subtract(7, 'days'), moment()],
    'Last 30 Days': [moment().subtract(30, 'days'), moment()],
    'This Month': [moment().startOf('month'), moment().endOf('month')],
    'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
  },
  daysOfWeek: moment.weekdaysMin(),
  monthNames: moment.monthsShort(),
  removeDropdownOnDestroy: false,
  cancelLabel: 'Cancel',
  applyLabel: 'Apply',
  customRangeLabel: 'Custom Range',
  showCustomRangeLabel: false,
  fromLabel: 'From',
  toLabel: 'To',
  hideAction: null,
  applyAction: null,
  cancelAction: null,
  autoUpdateInput: true,
  autoApply: false,
  alwaysShowCalendars: false,
  context: undefined,
  firstDay: 0,
  isInvalidDate: noop,
  isCustomDate: noop,

  // Init the dropdown when the component is added to the DOM
  didInsertElement() {
    this._super(...arguments);
    this.setupPicker();
  },

  didUpdateAttrs() {
    this._super(...arguments);
    this.setupPicker();
  },

  // Remove the hidden dropdown when this component is destroyed
  willDestroy() {
    this._super(...arguments);

    cancel(this._setupTimer);

    if (this.get('removeDropdownOnDestroy')) {
      let elements = this.element.querySelectorAll('.daterangepicker');
      elements.forEach(el => el.parentNode.removeChild(el));
    }
  },

  getOptions() {
    let momentStartDate = moment(this.get('start'), this.get('serverFormat'));
    let momentEndDate = moment(this.get('end'), this.get('serverFormat'));

    let startDate = momentStartDate.isValid() ? momentStartDate : undefined;
    let endDate = momentEndDate.isValid() ? momentEndDate : undefined;

    let momentMinDate = moment(this.get('minDate'), this.get('serverFormat'));
    let momentMaxDate = moment(this.get('maxDate'), this.get('serverFormat'));
    let minDate = momentMinDate.isValid() ? momentMinDate : undefined;
    let maxDate = momentMaxDate.isValid() ? momentMaxDate : undefined;

    let showCustomRangeLabel = this.get('showCustomRangeLabel');

    let options = this.getProperties(
      'isInvalidDate',
      'isCustomDate',
      'alwaysShowCalendars',
      'autoUpdateInput',
      'autoApply',
      'timePicker',
      'buttonClasses',
      'applyClass',
      'cancelClass',
      'singleDatePicker',
      'drops',
      'opens',
      'timePicker24Hour',
      'timePickerSeconds',
      'timePickerIncrement',
      'showWeekNumbers',
      'showDropdowns',
      'showCustomRangeLabel',
      'linkedCalendars',
      'dateLimit',
      'parentEl'
    );

    let localeOptions = this.getProperties(
      'applyLabel',
      'cancelLabel',
      'customRangeLabel',
      'daysOfWeek',
      'direction',
      'firstDay',
      'format',
      'fromLabel',
      'monthNames',
      'separator',
      'toLabel'
    );

    const defaultOptions = {
      locale: localeOptions,
      showCustomRangeLabel: showCustomRangeLabel,
      startDate: startDate,
      endDate: endDate,
      minDate: minDate,
      maxDate: maxDate,
    };

    if (!this.get('singleDatePicker')) {
      options.ranges = this.get('ranges');
    }

    return { ...options, ...defaultOptions };
  },

  setupPicker() {
    cancel(this._setupTimer);
    this._setupTimer = scheduleOnce('afterRender', this, this._setupPicker);
  },

  _setupPicker() {
    let input = $(this.element.querySelector('.daterangepicker-input'));
    input.daterangepicker(this.getOptions());
    this.attachPickerEvents();
  },

  attachPickerEvents() {
    let input = $(this.element.querySelector('.daterangepicker-input'));

    input.on('apply.daterangepicker', (ev, picker) => {
      this.handleDateRangePickerEvent('applyAction', picker);
    });

    input.on('hide.daterangepicker', (ev, picker) => {
      this.handleDateRangePickerEvent('hideAction', picker);
    });

    input.on('cancel.daterangepicker', () => {
      this.handleDateRangePickerEvent('cancelAction', undefined, true);
    });
  },

  handleDateRangePickerEvent(actionName, picker, isCancel = false) {
    let action = this.get(actionName);
    let start;
    let end;

    if (!isCancel) {
      start = picker.startDate.format(this.get('serverFormat'));
      end = picker.endDate.format(this.get('serverFormat'));
    }

    if (action) {
      assert(
        `${actionName} for date-range-picker must be a function`,
        typeof action === 'function'
      );
      this[actionName](start, end, picker);
    } else {
      if (!this.isDestroyed) {
        this.setProperties({ start, end });
      }
    }
  }
});
