var common = require('../../');
var _ = require('underscore');

describe('coarse_reduce', function() {
  var values = [
    {count: 1, lat: 10, lon: 20 },
    {count: 1, lat: 30, lon: 60 }
  ];
  var reduced = common.coarse_reduce(['x','y'], values, false);
  it('handles map output', function() {
    expect(reduced).toEqual(
      {count: 2, lat: 20, lon: 40}
    );
  });
  it('handles rereduce', function() {
    expect(common.coarse_reduce(null, [reduced,reduced], true)).toEqual(
      {count: 4, lat: 20, lon: 40}
    );
  });
});

describe('bbox', function() {
  var ref = {
    string: {bbox: '52.1,13.2,53.1,13.91', fun: 'toString'},
    leaflet: {bbox: [[52.1,13.2],[53.1,13.91]], fun: 'toLeaflet'},
    geocouch: {bbox: [13.2,52.1,13.91,53.1], fun: 'toGeocouch'}
  };

  _.each(_.keys(ref), function(input) {
    var bbox = common.bbox(ref[input].bbox);
    _.each(_.keys(ref), function(output) {
      it('accepts '+input+' and converts to '+output, function() {
        expect(bbox[ref[output].fun]()).toEqual(ref[output].bbox);
      });
    });
  });
  it('returns undefined for invalid input', function() {
    expect(common.bbox('1,2,3,bla')).toBe(undefined);
  });
  it('checks for points in bbox', function() {
    var bbox = common.bbox(ref.string.bbox);
    expect(bbox.contains(52.3, 13.7)).toBe(true);
    expect(bbox.contains(51, 10)).toBe(false);
  });
});
